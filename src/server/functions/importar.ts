import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { ingestionJobs, products, priceEntries, categories } from '#/db/schema'
import { eq, ilike, and } from 'drizzle-orm'
import { requireUserId } from '#/server/get-user'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtractedProduct = {
  name: string
  brand?: string
  price: string
  unit?: string
  category?: string
}

// ─── Prompt (compartilhado por todos os provedores) ───────────────────────────

const SYSTEM_PROMPT = `Você é um especialista em extração de dados de supermercados brasileiros.

NORMALIZAÇÃO OBRIGATÓRIA DE NOMES:
- Use MAIÚSCULAS em todos os nomes
- Formato: MARCA + PRODUTO + QUANTIDADE  →  "COCA-COLA 2L", "ARROZ TIOJOÃO 5KG"
- Padronize unidades: ml→ML | litro/litros/l→L | kg/quilo/quilos→KG | g/grama/gramas→G | un/unid/unidade→UN
- Remova artigos soltos: "o", "a", "os", "as"
- Não repita a marca no campo brand se já está no name

PREÇOS — somente números e ponto decimal ("9.99", sem R$, sem vírgula):
- Preço normal: use diretamente
- "de R$12,90 por R$8,00": use 8.00 (preço com desconto)
- "3 por R$10" ou "3un R$10": divida pelo volume → price = "3.33"
- "Leve 3 Pague 2": use o preço unitário normal exibido
- "50% off" ou "% de desconto": aplique o desconto e retorne o preço final
- Preço por kg/unidade exibido separado: ignore, use sempre o preço total do produto
- Preço ilegível ou ambíguo: OMITA o produto (nunca invente valor)

QUALIDADE DE OCR:
- Texto ilegível: omita o produto completamente
- Nome parcialmente legível: infira o produto se a leitura for razoável, caso contrário omita
- Imagem borrada ou recortada: extraia apenas o que for legível com certeza

CATEGORIAS — use EXATAMENTE um destes nomes:
Açougue | Aves e Ovos | Bebidas Alcoólicas | Bebidas não Alcoólicas | Bebê |
Biscoitos e Chocolates | Congelados | Frios e Laticínios | Grãos e Cereais |
Higiene e Beleza | Hortifruti | Limpeza | Mercearia | Padaria | Pescados

REGRAS DE CATEGORIZAÇÃO:
- arroz, macarrão, óleo, sal, açúcar, farinha, vinagre, molho → Mercearia
- feijão, lentilha, ervilha, grão-de-bico → Grãos e Cereais
- refrigerante, suco, água, isotônico, energético → Bebidas não Alcoólicas
- cerveja, vinho, cachaça, vodka, whisky → Bebidas Alcoólicas
- shampoo, condicionador, sabonete, desodorante, creme, perfume, absorvente → Higiene e Beleza
- detergente, sabão em pó, amaciante, desinfetante, água sanitária, esponja → Limpeza
- fralda, lenço umedecido, talco, papinha, mamadeira → Bebê
- frango, pato, ovo de galinha → Aves e Ovos
- carne bovina, suína, linguiça, salsicha, hambúrguer → Açougue
- peixe, camarão, atum, sardinha, frutos do mar → Pescados
- iogurte, queijo, manteiga, requeijão, creme de leite, leite → Frios e Laticínios
- sorvete, pizza congelada, lasanha, nugget → Congelados
- pão, bolo, torta, croissant → Padaria
- fruta, verdura, legume, cogumelo → Hortifruti
- biscoito, bolacha, chocolate, bala, pirulito, chiclete → Biscoitos e Chocolates

Se não conseguir identificar a categoria com certeza, use "Mercearia".`

const EXTRACTION_PROMPT = (supermarketName: string) =>
  `Extraia TODOS os produtos com preços do encarte do ${supermarketName}.
Retorne APENAS um JSON array, sem texto antes ou depois:
[{"name":"NOME NORMALIZADO","brand":"MARCA","price":"9.99","unit":"5KG","category":"Categoria"}]
Se não encontrar nenhum produto retorne [].`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, '\n')
    .trim()
    .slice(0, 40000)
}

// Palavras que descrevem embalagem mas não identificam o produto
const EMBALAGEM_RE = /\b(LATA[OÃ]?|LATAO|GARRAF[AÃ]O|GARRAFÃO|GARRAFINHA|GARRAFA|PET|VIDRO|TETRA\s*PA[KC]K?|LONGA\s*VIDA)\b/g

function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(\d+)\s*MILILITROS?\b/g, '$1ML')
    .replace(/\b(\d+)\s*LITROS?\b/g, '$1L')
    .replace(/\b(\d+)\s*QUILOGRAMAS?\b/g, '$1KG')
    .replace(/\b(\d+)\s*QUILOS?\b/g, '$1KG')
    .replace(/\b(\d+)\s*GRAMAS?\b/g, '$1G')
    .replace(/\b(\d+)\s*UNIDADES?\b/g, '$1UN')
    .replace(EMBALAGEM_RE, '')   // Remove palavras de embalagem (LATA, LATÃO, GARRAFA, PET...)
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function parsePrice(raw: string): number | null {
  if (!raw) return null
  const n = parseFloat(raw.replace(',', '.').replace(/[^\d.]/g, ''))
  return isNaN(n) || n <= 0 || n > 99999 ? null : n
}

function parseJson(text: string): ExtractedProduct[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) } catch { return [] }
}

// ─── Provedor: Gemini (Google AI) ─────────────────────────────────────────────
// Tenta modelos em ordem até um funcionar (quotas independentes)

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash']

function isGeminiRetryable(msg: string) {
  return msg.includes('429') || msg.includes('503') || msg.includes('quota') ||
    msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Service Unavailable') ||
    msg.includes('high demand') || msg.includes('overloaded')
}

async function geminiExtractText(text: string, supermarketName: string): Promise<ExtractedProduct[]> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  let lastErr: any
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genai.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT })
      const result = await model.generateContent(`${EXTRACTION_PROMPT(supermarketName)}\n\nTEXTO:\n${text}`)
      return parseJson(result.response.text())
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (isGeminiRetryable(msg)) {
        console.warn(`[Gemini] ${modelName} indisponível — tentando próximo modelo`)
        lastErr = err
        continue
      }
      throw err
    }
  }
  throw lastErr
}

async function geminiExtractFile(base64: string, mimeType: string, supermarketName: string): Promise<ExtractedProduct[]> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  let lastErr: any
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genai.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT })
      const result = await model.generateContent([
        { inlineData: { mimeType, data: base64 } },
        EXTRACTION_PROMPT(supermarketName),
      ])
      return parseJson(result.response.text())
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (isGeminiRetryable(msg)) {
        console.warn(`[Gemini] ${modelName} indisponível — tentando próximo modelo`)
        lastErr = err
        continue
      }
      throw err
    }
  }
  throw lastErr
}

// ─── Provedor: Claude (Anthropic — pago, opcional) ───────────────────────────

async function claudeExtractText(text: string, supermarketName: string): Promise<ExtractedProduct[]> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `${EXTRACTION_PROMPT(supermarketName)}\n\nTEXTO:\n${text}` }],
  })
  return parseJson(msg.content[0].type === 'text' ? msg.content[0].text : '')
}

async function claudeExtractFile(base64: string, mimeType: string, supermarketName: string): Promise<ExtractedProduct[]> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const isPdf = mimeType === 'application/pdf'
  const fileBlock = isPdf
    ? ({ type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } })
    : ({ type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: base64 } })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: EXTRACTION_PROMPT(supermarketName) }] }],
  })
  return parseJson(msg.content[0].type === 'text' ? msg.content[0].text : '')
}

// ─── Roteador de provedores ───────────────────────────────────────────────────
// Preferência: Gemini → Claude fallback automático em caso de erro/quota → erro

function hasGemini() { return !!process.env.GOOGLE_AI_API_KEY }
function hasClaude() { return !!process.env.ANTHROPIC_API_KEY }

function requireProvider() {
  if (!hasGemini() && !hasClaude()) {
    throw new Error(
      'Nenhuma chave de IA configurada. Adicione GOOGLE_AI_API_KEY ou ANTHROPIC_API_KEY no .env e reinicie o servidor.'
    )
  }
}

async function extrairDeTexto(text: string, supermarketName: string): Promise<ExtractedProduct[]> {
  requireProvider()
  if (hasGemini()) {
    try {
      return await geminiExtractText(text, supermarketName)
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (isGeminiRetryable(msg) && hasClaude()) {
        console.warn('[Gemini] Quota/rate limit — usando Claude como fallback')
        return claudeExtractText(text, supermarketName)
      }
      throw err
    }
  }
  return claudeExtractText(text, supermarketName)
}

async function extrairDeArquivo(base64: string, mimeType: string, supermarketName: string): Promise<ExtractedProduct[]> {
  requireProvider()
  if (hasGemini()) {
    try {
      return await geminiExtractFile(base64, mimeType, supermarketName)
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (isGeminiRetryable(msg) && hasClaude()) {
        console.warn('[Gemini] Quota/rate limit — usando Claude como fallback')
        return claudeExtractFile(base64, mimeType, supermarketName)
      }
      throw err
    }
  }
  return claudeExtractFile(base64, mimeType, supermarketName)
}

// ─── Scraping de links com Playwright (gratuito, sem API) ────────────────────
// Playwright renderiza JavaScript — captura sites como Carrefour, Extra, Assaí
// que dependem de JS para exibir produtos.
// Requer: bunx playwright install chromium  (baixa ~300MB uma vez)

const IS_VERCEL = !!(process.env.VERCEL || process.env.VERCEL_ENV)

async function fetchPageContent(url: string): Promise<string> {
  if (!IS_VERCEL) {
    try {
      const { chromium } = await import('playwright')
      const browser = await chromium.launch({ headless: true })
      const page = await browser.newPage()
      await page.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' })
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)
      const text = await page.evaluate(() => document.body.innerText)
      await browser.close()
      return text.slice(0, 40000)
    } catch {
      // Playwright não instalado ou falhou → cai no fetch abaixo
    }
  }

  // Fetch simples (funciona em Vercel e como fallback do Playwright)
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    signal: AbortSignal.timeout(30000),
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
  return stripHtml(await resp.text())
}

// ─── Persistência com deduplicação ────────────────────────────────────────────

async function salvarProdutos(
  userId: string,
  extracted: ExtractedProduct[],
  supermarketId: string,
  sourceType: 'link' | 'photo' | 'pdf',
  sourceUrl?: string,
  isPromo = false,
) {
  const allCats = await db.select().from(categories)
  const catByName = new Map(allCats.map(c => [c.name.toLowerCase(), c.id]))

  async function resolverOuCriarCategoria(raw?: string): Promise<string | null> {
    if (!raw) return null
    const key = raw.trim().toLowerCase()
    if (catByName.has(key)) return catByName.get(key)!
    for (const [k, v] of catByName) {
      if (k.includes(key) || key.includes(k)) return v
    }
    // Cria categoria desconhecida automaticamente
    const name = raw.trim()
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const [newCat] = await db.insert(categories).values({ name, slug }).returning()
    catByName.set(key, newCat.id)
    return newCat.id
  }

  // Para links: remove entradas antigas dessa URL+tipo antes de reinserir (reimportação)
  // Filtra por isPromo para não apagar o preço normal ao reimportar como promoção
  if (sourceUrl) {
    await db.delete(priceEntries).where(
      and(
        eq(priceEntries.supermarketId, supermarketId),
        eq(priceEntries.sourceUrl, sourceUrl),
        eq(priceEntries.isPromo, isPromo),
      )
    )
  }

  let imported = 0

  for (const item of extracted) {
    if (!item.name || !item.price) continue
    const priceNum = parsePrice(item.price)
    if (!priceNum) continue

    const normalizedName = normalizeName(item.name)

    let [prod] = await db.select().from(products)
      .where(and(ilike(products.name, normalizedName), eq(products.userId, userId)))
      .limit(1)

    // Second pass: existing products may still have container words (LATA, GARRAFA…)
    // Try to find them by quantity token and compare after normalizing their stored name
    if (!prod) {
      const qtyMatch = normalizedName.match(/\b(\d+(?:[.,]\d+)?(ML|L|KG|G|UN))\b/)
      if (qtyMatch) {
        const candidates = await db.select({ id: products.id, name: products.name })
          .from(products)
          .where(and(ilike(products.name, `%${qtyMatch[1]}%`), eq(products.userId, userId)))
          .limit(100)
        const match = candidates.find(c => normalizeName(c.name) === normalizedName)
        if (match) {
          // Fetch full row and rename to normalized form so future lookups succeed
          const [full] = await db.select().from(products).where(eq(products.id, match.id)).limit(1)
          if (full) {
            await db.update(products).set({ name: normalizedName }).where(eq(products.id, full.id))
            prod = { ...full, name: normalizedName }
          }
        }
      }
    }

    if (!prod) {
      const [newProd] = await db.insert(products).values({
        userId,
        name: normalizedName,
        brand: item.brand ? item.brand.trim().toUpperCase() : null,
        categoryId: await resolverOuCriarCategoria(item.category),
        unit: item.unit ? item.unit.trim().toUpperCase() : null,
      }).returning()
      prod = newProd
    }

    if (sourceUrl) {
      // Links: simplesmente insere (já limpou duplicatas acima)
      await db.insert(priceEntries).values({
        productId: prod.id, supermarketId, isPromo,
        price: priceNum.toFixed(2), sourceType, sourceUrl, validFrom: new Date(),
      })
    } else {
      // Arquivos (foto/pdf): upsert por (produto, supermercado, isPromo) — normal e promo coexistem
      const [existing] = await db.select({ id: priceEntries.id })
        .from(priceEntries)
        .where(and(
          eq(priceEntries.productId, prod.id),
          eq(priceEntries.supermarketId, supermarketId),
          eq(priceEntries.isPromo, isPromo),
        ))
        .limit(1)

      if (existing) {
        await db.update(priceEntries)
          .set({ price: priceNum.toFixed(2), sourceType, isPromo, validFrom: new Date() })
          .where(eq(priceEntries.id, existing.id))
      } else {
        await db.insert(priceEntries).values({
          productId: prod.id, supermarketId, isPromo,
          price: priceNum.toFixed(2), sourceType, validFrom: new Date(),
        })
      }
    }
    imported++
  }

  return { found: extracted.length, imported }
}

// ─── Server Functions ─────────────────────────────────────────────────────────

export const verificarProvedores = createServerFn({ method: 'GET' }).handler(async () => ({
  gemini: hasGemini(),
  claude: hasClaude(),
  playwright: !IS_VERCEL && await import('playwright').then(() => true).catch(() => false),
}))

export const importarLink = createServerFn({ method: 'POST' })
  .inputValidator((d: { supermarketId: string; supermarketName: string; url: string; isPromo?: boolean }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    requireProvider()

    const [job] = await db.insert(ingestionJobs).values({
      userId,
      supermarketId: data.supermarketId,
      sourceType: 'link',
      sourceUrl: data.url,
      status: 'running',
    }).returning()

    try {
      const text = await fetchPageContent(data.url)
      const extracted = await extrairDeTexto(text, data.supermarketName)
      const { found, imported } = await salvarProdutos(userId, extracted, data.supermarketId, 'link', data.url, data.isPromo ?? false)

      await db.update(ingestionJobs).set({
        status: 'completed', productsFound: found, productsImported: imported, completedAt: new Date(),
      }).where(eq(ingestionJobs.id, job.id))

      return { ok: true, found, imported, jobId: job.id }
    } catch (err: any) {
      await db.update(ingestionJobs).set({
        status: 'failed', errorMessage: err?.message ?? 'Erro desconhecido',
      }).where(eq(ingestionJobs.id, job.id))
      throw err
    }
  })

export const importarArquivo = createServerFn({ method: 'POST' })
  .inputValidator((d: { supermarketId: string; supermarketName: string; base64: string; mimeType: string; isPromo?: boolean }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    requireProvider()

    const sourceType = data.mimeType === 'application/pdf' ? 'pdf' as const : 'photo' as const

    const [job] = await db.insert(ingestionJobs).values({
      userId,
      supermarketId: data.supermarketId,
      sourceType,
      status: 'running',
    }).returning()

    try {
      const extracted = await extrairDeArquivo(data.base64, data.mimeType, data.supermarketName)
      const { found, imported } = await salvarProdutos(userId, extracted, data.supermarketId, sourceType, undefined, data.isPromo ?? false)

      await db.update(ingestionJobs).set({
        status: 'completed', productsFound: found, productsImported: imported, completedAt: new Date(),
      }).where(eq(ingestionJobs.id, job.id))

      return { ok: true, found, imported, jobId: job.id }
    } catch (err: any) {
      await db.update(ingestionJobs).set({
        status: 'failed', errorMessage: err?.message ?? 'Erro desconhecido',
      }).where(eq(ingestionJobs.id, job.id))
      throw err
    }
  })

export const listarJobs = createServerFn({ method: 'GET' }).handler(async ({ request }) => {
  const userId = await requireUserId(request)
  const jobs = await db.select().from(ingestionJobs)
    .where(eq(ingestionJobs.userId, userId))
    .orderBy(ingestionJobs.createdAt)
  return jobs.reverse().slice(0, 20)
})

export const excluirJob = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    await db.delete(ingestionJobs).where(and(eq(ingestionJobs.id, data.id), eq(ingestionJobs.userId, userId)))
    return { ok: true }
  })
