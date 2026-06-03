import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { shoppingListItems, products, priceEntries, supermarkets, categories } from '#/db/schema'
import { eq, asc, isNull, isNotNull, or, sql } from 'drizzle-orm'

export const listarItensLista = createServerFn({ method: 'GET' }).handler(async () => {
  // Passo 1: IDs de produtos que têm pelo menos um preço
  const comPreco = await db
    .selectDistinct({ productId: priceEntries.productId })
    .from(priceEntries)
  const idsComPreco = comPreco.map(r => r.productId)

  // Passo 2: encontra itens inválidos (produto excluído ou sem preço)
  const todosItens = await db
    .select({ id: shoppingListItems.id, productId: shoppingListItems.productId })
    .from(shoppingListItems)

  const invalidos = todosItens
    .filter(i => i.productId !== null && !idsComPreco.includes(i.productId))
    .map(i => i.id)

  if (invalidos.length > 0) {
    await db.delete(shoppingListItems).where(
      sql`id = ANY(ARRAY[${sql.join(invalidos.map(id => sql`${id}`), sql`, `)}]::text[])`
    )
  }

  // Passo 3: busca os itens válidos
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

  // Passo 4: melhor preço + supermercado para cada produto
  const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as string[]
  const infoMap = new Map<string, { price: number; supermarket: string }>()

  if (productIds.length > 0) {
    const precos = await db.select({
      productId: priceEntries.productId,
      price: priceEntries.price,
      supermarketName: supermarkets.name,
    })
      .from(priceEntries)
      .innerJoin(supermarkets, eq(priceEntries.supermarketId, supermarkets.id))
      .where(sql`${priceEntries.productId} = ANY(ARRAY[${sql.join(productIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
      .orderBy(priceEntries.price)

    for (const p of precos) {
      if (!infoMap.has(p.productId))
        infoMap.set(p.productId, { price: Number(p.price), supermarket: p.supermarketName })
    }
  }

  return items.map(item => ({
    ...item,
    bestPrice: item.productId ? (infoMap.get(item.productId)?.price ?? null) : null,
    bestSupermarket: item.productId ? (infoMap.get(item.productId)?.supermarket ?? null) : null,
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
