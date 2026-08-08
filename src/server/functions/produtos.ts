import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { products, priceEntries, categories, supermarkets, shoppingListItems } from '#/db/schema'
import { eq, ilike, or, and, sql } from 'drizzle-orm'
import { requireUserId } from '#/server/get-user'

const EMBALAGEM_RE = /\b(LATÃO|LATAO|LATA[OÃ]?|GARRAFÃO|GARRAF[AÃ]O|GARRAFINHA|GARRAFA|PET|VIDRO|TETRA\s*PA[KC]K?|LONGA\s*VIDA)\b/g

function normalizeName(name: string): string {
  return name
    .toUpperCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(\d+)\s*MILILITROS?\b/g, '$1ML')
    .replace(/\b(\d+)\s*LITROS?\b/g, '$1L')
    .replace(/\b(\d+)\s*QUILOGRAMAS?\b/g, '$1KG')
    .replace(/\b(\d+)\s*QUILOS?\b/g, '$1KG')
    .replace(/\b(\d+)\s*GRAMAS?\b/g, '$1G')
    .replace(/\b(\d+)\s*UNIDADES?\b/g, '$1UN')
    .replace(EMBALAGEM_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export const listarProdutos = createServerFn({ method: 'POST' })
  .inputValidator((d: { busca?: string; categoriaId?: string; limit?: number; offset?: number }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const where: any[] = [eq(products.userId, userId)]
    if (data.busca) where.push(or(ilike(products.name, `%${data.busca}%`), ilike(products.brand, `%${data.busca}%`)))
    if (data.categoriaId) where.push(eq(products.categoryId, data.categoriaId))

    return db.select({
      id: products.id, name: products.name, brand: products.brand,
      unit: products.unit, imageUrl: products.imageUrl, categoryId: products.categoryId,
      categoryName: categories.name, categorySlug: categories.slug,
    })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...where))
      .orderBy(products.name)
      .limit(data.limit ?? 100)
      .offset(data.offset ?? 0)
  })

export const buscarProdutosComPrecos = createServerFn({ method: 'POST' })
  .inputValidator((d: { busca: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const prods = await db.select({
      id: products.id, name: products.name, brand: products.brand,
      unit: products.unit, categoryName: categories.name,
    })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(
        eq(products.userId, userId),
        or(ilike(products.name, `%${data.busca}%`), ilike(products.brand, `%${data.busca}%`)),
      ))
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

    return prods
      .map(p => ({ ...p, prices: prices.filter(pr => pr.productId === p.id) }))
      .filter(p => p.prices.length > 0)
  })

export const criarProduto = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; brand?: string; categoryId?: string; unit?: string; barcode?: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const [p] = await db.insert(products).values({
      userId,
      name: data.name, brand: data.brand || null,
      categoryId: data.categoryId || null, unit: data.unit || null, barcode: data.barcode || null,
    }).returning()
    return p
  })

export const atualizarProduto = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; name: string; brand?: string; categoryId?: string; unit?: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const [p] = await db.update(products)
      .set({ name: data.name, brand: data.brand || null, categoryId: data.categoryId || null, unit: data.unit || null })
      .where(and(eq(products.id, data.id), eq(products.userId, userId)))
      .returning()
    return p
  })

export const excluirProduto = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    await db.delete(shoppingListItems).where(
      and(eq(shoppingListItems.productId, data.id), eq(shoppingListItems.userId, userId))
    )
    await db.delete(products).where(and(eq(products.id, data.id), eq(products.userId, userId)))
    return { ok: true }
  })

export const excluirProdutosEmLote = createServerFn({ method: 'POST' })
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    if (!data.ids.length) return { ok: true, deleted: 0 }
    await db.delete(shoppingListItems).where(
      and(
        sql`${shoppingListItems.productId} = ANY(ARRAY[${sql.join(data.ids.map(id => sql`${id}`), sql`, `)}]::text[])`,
        eq(shoppingListItems.userId, userId),
      )
    )
    await db.delete(products).where(
      and(
        sql`${products.id} = ANY(ARRAY[${sql.join(data.ids.map(id => sql`${id}`), sql`, `)}]::text[])`,
        eq(products.userId, userId),
      )
    )
    return { ok: true, deleted: data.ids.length }
  })

export const mesclarDuplicatas = createServerFn({ method: 'POST' })
  .handler(async ({ request }) => {
    const userId = await requireUserId(request)
    const allProducts = await db.select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.userId, userId))

    const groups = new Map<string, { id: string; name: string }[]>()
    for (const p of allProducts) {
      const key = normalizeName(p.name)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }

    let merged = 0

    for (const [normalizedName, group] of groups) {
      if (group.length <= 1) continue

      const counts = await Promise.all(group.map(async p => {
        const [row] = await db.select({ count: sql<number>`count(*)::int` })
          .from(priceEntries).where(eq(priceEntries.productId, p.id))
        return { id: p.id, count: row?.count ?? 0 }
      }))
      counts.sort((a, b) => b.count - a.count)

      const winnerId = counts[0].id
      const loserIds = counts.slice(1).map(c => c.id)

      for (const loserId of loserIds) {
        await db.update(priceEntries)
          .set({ productId: winnerId })
          .where(eq(priceEntries.productId, loserId))
      }

      await db.update(products)
        .set({ name: normalizedName })
        .where(eq(products.id, winnerId))

      for (const loserId of loserIds) {
        await db.delete(products).where(eq(products.id, loserId))
      }

      merged += loserIds.length
    }

    return { ok: true, merged }
  })

export const buscarProdutoPorCodigoBarras = createServerFn({ method: 'POST' })
  .inputValidator((d: { barcode: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const [produto] = await db.select({
      id: products.id, name: products.name, brand: products.brand, unit: products.unit,
    })
      .from(products)
      .where(and(eq(products.userId, userId), eq(products.barcode, data.barcode)))
      .limit(1)
    return produto ?? null
  })

export const historicoPrecoProduto = createServerFn({ method: 'POST' })
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const entries = await db.select({
      id: priceEntries.id,
      price: priceEntries.price,
      pricePerUnit: priceEntries.pricePerUnit,
      isPromo: priceEntries.isPromo,
      sourceType: priceEntries.sourceType,
      createdAt: priceEntries.createdAt,
      supermarketId: priceEntries.supermarketId,
      supermarketName: supermarkets.name,
    })
      .from(priceEntries)
      .innerJoin(products, eq(priceEntries.productId, products.id))
      .innerJoin(supermarkets, eq(priceEntries.supermarketId, supermarkets.id))
      .where(and(eq(priceEntries.productId, data.productId), eq(products.userId, userId)))
      .orderBy(priceEntries.createdAt)
    return entries
  })

export const listarProdutosComPrecos = createServerFn({ method: 'POST' })
  .inputValidator((d: { busca?: string; categoriaId?: string; supermarketId?: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const where: any[] = [eq(products.userId, userId)]
    if (data.busca) where.push(or(ilike(products.name, `%${data.busca}%`), ilike(products.brand, `%${data.busca}%`)))
    if (data.categoriaId) where.push(eq(products.categoryId, data.categoriaId))
    if (data.supermarketId) where.push(eq(priceEntries.supermarketId, data.supermarketId))

    const rows = await db.select({
      productId: products.id,
      name: products.name,
      brand: products.brand,
      unit: products.unit,
      categoryId: products.categoryId,
      categoryName: categories.name,
      price: priceEntries.price,
      pricePerUnit: priceEntries.pricePerUnit,
      isPromo: priceEntries.isPromo,
      supermarketId: priceEntries.supermarketId,
      supermarketName: supermarkets.name,
      priceEntryId: priceEntries.id,
      priceCreatedAt: priceEntries.createdAt,
    })
      .from(priceEntries)
      .innerJoin(products, eq(priceEntries.productId, products.id))
      .innerJoin(supermarkets, eq(priceEntries.supermarketId, supermarkets.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...where))
      .orderBy(supermarkets.name, categories.name, products.name, priceEntries.createdAt)

    type Combined = {
      productId: string; name: string; brand: string | null; unit: string | null
      categoryId: string | null; categoryName: string | null
      supermarketId: string; supermarketName: string
      normalPrice: string | null; normalEntryId: string | null; normalPricePerUnit: string | null
      promoPrice: string | null; promoEntryId: string | null; promoPricePerUnit: string | null
      normalCreatedAt: Date | null; promoCreatedAt: Date | null
    }
    const map = new Map<string, Combined>()

    for (const row of rows) {
      const key = `${row.productId}:${row.supermarketId}`
      if (!map.has(key)) {
        map.set(key, {
          productId: row.productId, name: row.name, brand: row.brand, unit: row.unit,
          categoryId: row.categoryId, categoryName: row.categoryName,
          supermarketId: row.supermarketId, supermarketName: row.supermarketName,
          normalPrice: null, normalEntryId: null, normalPricePerUnit: null, normalCreatedAt: null,
          promoPrice: null, promoEntryId: null, promoPricePerUnit: null, promoCreatedAt: null,
        })
      }
      const entry = map.get(key)!
      const createdAt = new Date(row.priceCreatedAt)
      if (row.isPromo) {
        if (!entry.promoCreatedAt || createdAt > entry.promoCreatedAt) {
          entry.promoPrice = row.price; entry.promoEntryId = row.priceEntryId
          entry.promoPricePerUnit = row.pricePerUnit; entry.promoCreatedAt = createdAt
        }
      } else {
        if (!entry.normalCreatedAt || createdAt > entry.normalCreatedAt) {
          entry.normalPrice = row.price; entry.normalEntryId = row.priceEntryId
          entry.normalPricePerUnit = row.pricePerUnit; entry.normalCreatedAt = createdAt
        }
      }
    }

    return Array.from(map.values())
      .map(({ normalCreatedAt, promoCreatedAt, ...rest }) => rest)
      .sort((a, b) =>
        a.supermarketName.localeCompare(b.supermarketName) ||
        (a.categoryName ?? '').localeCompare(b.categoryName ?? '') ||
        a.name.localeCompare(b.name)
      )
  })
