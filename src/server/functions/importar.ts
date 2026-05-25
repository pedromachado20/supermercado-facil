import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { ingestionJobs, products, priceEntries, categories } from '#/db/schema'
import { eq, ilike } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ExtractedProduct = { name: string; brand?: string; price: string; unit?: string; category?: string }

async function extrairDeLinkHtml(html: string, supermarketName: string): Promise<ExtractedProduct[]> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Analise o HTML abaixo do ${supermarketName} e extraia TODOS os produtos com preços.

Retorne APENAS um JSON array sem texto extra:
[{"name":"Nome","brand":"Marca","price":"9.99","unit":"5kg","category":"Categoria"}]

Regras: price só números+ponto (sem R$). Categorias: Açougue, Bebidas Alcoólicas, Bebidas não Alcoólicas, Limpeza, Hortifruti, Frios e Laticínios, Mercearia, Padaria, Higiene e Beleza, Congelados, Aves e Ovos, Pescados, Biscoitos e Chocolates, Grãos e Cereais. Se não achar produtos retorne [].

HTML:
${html.slice(0, 80000)}`,
    }],
  })
  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) } catch { return [] }
}

async function extrairDeImagem(base64: string, mimeType: string, supermarketName: string): Promise<ExtractedProduct[]> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType as 'image/jpeg', data: base64 } },
        { type: 'text', text: `Analise este encarte do ${supermarketName} e extraia TODOS os produtos visíveis com preço.

Retorne APENAS um JSON array:
[{"name":"Nome","brand":"Marca","price":"9.99","unit":"5kg","category":"Categoria"}]

Regras: price só números+ponto. Normalize categoria para: Açougue, Bebidas Alcoólicas, Bebidas não Alcoólicas, Limpeza, Hortifruti, Frios e Laticínios, Mercearia, Padaria, Higiene e Beleza, Congelados, Aves e Ovos, Pescados, Biscoitos e Chocolates, Grãos e Cereais. Se não achar retorne [].` },
      ],
    }],
  })
  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) } catch { return [] }
}

async function normalizarCategoria(categoryName: string, cats: { id: string; name: string }[]): Promise<string | null> {
  if (!categoryName || !cats.length) return null
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 50,
    messages: [{
      role: 'user',
      content: `Dado "${categoryName}", qual é a mais adequada: ${cats.map(c => c.name).join(', ')}? Responda apenas o nome exato.`,
    }],
  })
  const resposta = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
  return cats.find(c => c.name.toLowerCase() === resposta.toLowerCase())?.id ?? null
}

async function salvarProdutos(extracted: ExtractedProduct[], supermarketId: string, sourceType: 'link' | 'photo' | 'pdf', sourceUrl?: string) {
  const allCats = await db.select().from(categories)
  let imported = 0

  for (const item of extracted) {
    if (!item.name || !item.price) continue
    const priceNum = parseFloat(item.price.replace(',', '.'))
    if (isNaN(priceNum) || priceNum <= 0) continue

    let [prod] = await db.select().from(products).where(ilike(products.name, item.name.trim())).limit(1)
    if (!prod) {
      let categoryId: string | null = null
      if (item.category && allCats.length) {
        const exact = allCats.find(c => c.name.toLowerCase() === item.category!.toLowerCase())
        categoryId = exact?.id ?? await normalizarCategoria(item.category, allCats)
      }
      const [newProd] = await db.insert(products).values({
        name: item.name.trim(), brand: item.brand?.trim() || null, categoryId, unit: item.unit?.trim() || null,
      }).returning()
      prod = newProd
    }

    await db.insert(priceEntries).values({
      productId: prod.id, supermarketId, price: priceNum.toFixed(2),
      sourceType, sourceUrl: sourceUrl || null, validFrom: new Date(),
    })
    imported++
  }
  return { found: extracted.length, imported }
}

export const importarLink = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { supermarketId: string; supermarketName: string; url: string } }) => {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Chave da IA não configurada. Adicione ANTHROPIC_API_KEY no arquivo .env e reinicie o servidor.')
  const [job] = await db.insert(ingestionJobs).values({ supermarketId: data.supermarketId, sourceType: 'link', sourceUrl: data.url, status: 'running' }).returning()
  try {
    const resp = await fetch(data.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) })
    const html = await resp.text()
    const extracted = await extrairDeLinkHtml(html, data.supermarketName)
    const { found, imported } = await salvarProdutos(extracted, data.supermarketId, 'link', data.url)
    await db.update(ingestionJobs).set({ status: 'completed', productsFound: found, productsImported: imported, completedAt: new Date() }).where(eq(ingestionJobs.id, job.id))
    return { ok: true, found, imported, jobId: job.id }
  } catch (err: any) {
    await db.update(ingestionJobs).set({ status: 'failed', errorMessage: err?.message ?? 'Erro' }).where(eq(ingestionJobs.id, job.id))
    throw err
  }
})

export const importarImagem = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { supermarketId: string; supermarketName: string; base64: string; mimeType: string } }) => {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Chave da IA não configurada. Adicione ANTHROPIC_API_KEY no arquivo .env e reinicie o servidor.')
  const sourceType = data.mimeType.includes('pdf') ? 'pdf' as const : 'photo' as const
  const [job] = await db.insert(ingestionJobs).values({ supermarketId: data.supermarketId, sourceType, status: 'running' }).returning()
  try {
    const extracted = await extrairDeImagem(data.base64, data.mimeType, data.supermarketName)
    const { found, imported } = await salvarProdutos(extracted, data.supermarketId, sourceType)
    await db.update(ingestionJobs).set({ status: 'completed', productsFound: found, productsImported: imported, completedAt: new Date() }).where(eq(ingestionJobs.id, job.id))
    return { ok: true, found, imported, jobId: job.id }
  } catch (err: any) {
    await db.update(ingestionJobs).set({ status: 'failed', errorMessage: err?.message ?? 'Erro' }).where(eq(ingestionJobs.id, job.id))
    throw err
  }
})

export const listarJobs = createServerFn({ method: 'GET' }).handler(async () => {
  const jobs = await db.select().from(ingestionJobs).orderBy(ingestionJobs.createdAt)
  return jobs.reverse().slice(0, 20)
})
