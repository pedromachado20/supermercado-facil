import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { products, priceEntries, categories, supermarkets } from '#/db/schema'
import { eq, ilike, or, and, sql } from 'drizzle-orm'

export const listarProdutos = createServerFn({ method: 'GET' }).handler(async ({ data }: { data?: { busca?: string; categoriaId?: string; limit?: number; offset?: number } }) => {
  const where: any[] = []
  if (data?.busca) where.push(or(ilike(products.name, `%${data.busca}%`), ilike(products.brand, `%${data.busca}%`)))
  if (data?.categoriaId) where.push(eq(products.categoryId, data.categoriaId))

  return db.select({
    id: products.id, name: products.name, brand: products.brand,
    unit: products.unit, imageUrl: products.imageUrl, categoryId: products.categoryId,
    categoryName: categories.name, categorySlug: categories.slug,
  })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(products.name)
    .limit(data?.limit ?? 100)
    .offset(data?.offset ?? 0)
})

export const buscarProdutosComPrecos = createServerFn({ method: 'GET' }).handler(async ({ data }: { data: { busca: string } }) => {
  const prods = await db.select({
    id: products.id, name: products.name, brand: products.brand,
    unit: products.unit, categoryName: categories.name,
  })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(or(ilike(products.name, `%${data.busca}%`), ilike(products.brand, `%${data.busca}%`)))
    .orderBy(products.name).limit(50)

  if (!prods.length) return []

  const prodIds = prods.map(p => p.id)
  const prices = await db.select({
    productId: priceEntries.productId, price: priceEntries.price,
    supermarketId: priceEntries.supermarketId, supermarketName: supermarkets.name,
    validFrom: priceEntries.validFrom,
  })
    .from(priceEntries)
    .innerJoin(supermarkets, eq(priceEntries.supermarketId, supermarkets.id))
    .where(sql`${priceEntries.productId} = ANY(ARRAY[${sql.join(prodIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
    .orderBy(priceEntries.price)

  return prods.map(p => ({ ...p, prices: prices.filter(pr => pr.productId === p.id) }))
})

export const criarProduto = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { name: string; brand?: string; categoryId?: string; unit?: string; barcode?: string } }) => {
  const [p] = await db.insert(products).values({
    name: data.name, brand: data.brand || null,
    categoryId: data.categoryId || null, unit: data.unit || null, barcode: data.barcode || null,
  }).returning()
  return p
})

export const criarEntradaPreco = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { productId: string; supermarketId: string; price: string; pricePerUnit?: string; sourceType: 'link' | 'photo' | 'pdf' | 'manual'; sourceUrl?: string } }) => {
  const [e] = await db.insert(priceEntries).values({
    productId: data.productId, supermarketId: data.supermarketId,
    price: data.price, pricePerUnit: data.pricePerUnit || null,
    sourceType: data.sourceType, sourceUrl: data.sourceUrl || null,
  }).returning()
  return e
})

export const excluirProduto = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { id: string } }) => {
  await db.delete(products).where(eq(products.id, data.id))
  return { ok: true }
})
