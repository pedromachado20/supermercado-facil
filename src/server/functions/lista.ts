import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { shoppingListItems, products, priceEntries, supermarkets, categories } from '#/db/schema'
import { eq, asc, isNull, isNotNull, or, sql } from 'drizzle-orm'

export const listarItensLista = createServerFn({ method: 'GET' }).handler(async () => {
  // Remove itens cujo produto foi excluído OU não tem nenhum preço cadastrado
  const invalidos = await db
    .select({ id: shoppingListItems.id })
    .from(shoppingListItems)
    .where(
      sql`${shoppingListItems.productId} IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM price_entries
          WHERE product_id = ${shoppingListItems.productId}
        )`
    )

  if (invalidos.length > 0) {
    const ids = invalidos.map(i => i.id)
    await db.delete(shoppingListItems).where(
      sql`id = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::text[])`
    )
  }

  const items = await db.select({
    id: shoppingListItems.id, productId: shoppingListItems.productId,
    customName: shoppingListItems.customName, quantity: shoppingListItems.quantity,
    unit: shoppingListItems.unit, checked: shoppingListItems.checked,
    sortOrder: shoppingListItems.sortOrder,
    productName: products.name, productBrand: products.brand, productUnit: products.unit,
    categoryName: categories.name,
  })
    .from(shoppingListItems)
    .leftJoin(products, eq(shoppingListItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(shoppingListItems.sortOrder), asc(shoppingListItems.createdAt))

  const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as string[]
  const priceMap = new Map<string, number>()

  if (productIds.length > 0) {
    const prices = await db.select({
      productId: priceEntries.productId,
      minPrice: sql<string>`MIN(${priceEntries.price})`,
    })
      .from(priceEntries)
      .where(sql`${priceEntries.productId} = ANY(ARRAY[${sql.join(productIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
      .groupBy(priceEntries.productId)
    for (const p of prices) priceMap.set(p.productId, Number(p.minPrice))
  }

  return items.map(item => ({
    ...item,
    bestPrice: item.productId ? (priceMap.get(item.productId) ?? null) : null,
  }))
})

export const adicionarItemLista = createServerFn({ method: 'POST' })
  .inputValidator((d: { productId?: string; customName?: string; quantity?: number; unit?: string }) => d)
  .handler(async ({ data }) => {
    const [item] = await db.insert(shoppingListItems).values({
      productId: data.productId || null,
      customName: data.customName || null,
      quantity: data.quantity ?? 1,
      unit: data.unit || null,
    }).returning()
    return item
  })

export const toggleItemLista = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; checked: boolean }) => d)
  .handler(async ({ data }) => {
    await db.update(shoppingListItems).set({ checked: data.checked }).where(eq(shoppingListItems.id, data.id))
    return { ok: true }
  })

export const removerItemLista = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, data.id))
    return { ok: true }
  })

export const limparListaMarcados = createServerFn({ method: 'POST' }).handler(async () => {
  await db.delete(shoppingListItems).where(eq(shoppingListItems.checked, true))
  return { ok: true }
})

export const buscarMelhorPrecoLista = createServerFn({ method: 'GET' }).handler(async () => {
  const itens = await db.select({
    id: shoppingListItems.id, productId: shoppingListItems.productId,
    quantity: shoppingListItems.quantity, checked: shoppingListItems.checked,
    productName: products.name, productBrand: products.brand,
  })
    .from(shoppingListItems)
    .leftJoin(products, eq(shoppingListItems.productId, products.id))
    .where(eq(shoppingListItems.checked, false))

  const resultado = []
  for (const item of itens) {
    if (!item.productId) {
      resultado.push({ itemId: item.id, productName: item.productName ?? item.id, quantity: item.quantity ?? 1, melhorMercado: null, melhorPreco: null, totalItem: null })
      continue
    }
    const prices = await db.select({ price: priceEntries.price, supermarketName: supermarkets.name })
      .from(priceEntries).innerJoin(supermarkets, eq(priceEntries.supermarketId, supermarkets.id))
      .where(eq(priceEntries.productId, item.productId)).orderBy(priceEntries.price).limit(1)
    const best = prices[0]
    resultado.push({
      itemId: item.id, productName: item.productName ?? item.id, quantity: item.quantity ?? 1,
      melhorMercado: best?.supermarketName ?? null, melhorPreco: best ? Number(best.price) : null,
      totalItem: best ? Number(best.price) * (item.quantity ?? 1) : null,
    })
  }
  return resultado
})
