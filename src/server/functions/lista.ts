import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { shoppingListItems, shoppingLists, products, priceEntries, supermarkets, categories } from '#/db/schema'
import { eq, asc, and, sql, desc } from 'drizzle-orm'
import { requireUserId } from '#/server/get-user'

// ─── Gerenciamento de múltiplas listas ───────────────────────────────────────

export const listarListas = createServerFn({ method: 'GET' }).handler(async ({ request }) => {
  const userId = await requireUserId(request)
  return db.select().from(shoppingLists)
    .where(eq(shoppingLists.userId, userId))
    .orderBy(desc(shoppingLists.isDefault), asc(shoppingLists.createdAt))
})

export const criarLista = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const [lista] = await db.insert(shoppingLists)
      .values({ userId, name: data.name, isDefault: false })
      .returning()
    return lista
  })

export const renomearLista = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; name: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    await db.update(shoppingLists)
      .set({ name: data.name })
      .where(and(eq(shoppingLists.id, data.id), eq(shoppingLists.userId, userId)))
    return { ok: true }
  })

export const excluirLista = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    await db.delete(shoppingLists)
      .where(and(eq(shoppingLists.id, data.id), eq(shoppingLists.userId, userId)))
    return { ok: true }
  })

export const obterOuCriarListaDefault = createServerFn({ method: 'GET' }).handler(async ({ request }) => {
  const userId = await requireUserId(request)
  const existing = await db.select().from(shoppingLists)
    .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.isDefault, true)))
    .limit(1)
  if (existing.length > 0) return existing[0]
  const [lista] = await db.insert(shoppingLists)
    .values({ userId, name: 'Minha Lista', isDefault: true })
    .returning()
  return lista
})

// ─── Itens de lista ───────────────────────────────────────────────────────────

export const listarItensLista = createServerFn({ method: 'POST' })
  .inputValidator((d: { listId?: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)

  // Passo 1: IDs de produtos do usuário que têm pelo menos um preço
  const comPreco = await db
    .selectDistinct({ productId: priceEntries.productId })
    .from(priceEntries)
    .innerJoin(products, eq(priceEntries.productId, products.id))
    .where(eq(products.userId, userId))
  const idsComPreco = comPreco.map(r => r.productId)

  const baseWhere = data.listId
    ? and(eq(shoppingListItems.userId, userId), eq(shoppingListItems.listId, data.listId))
    : eq(shoppingListItems.userId, userId)

  // Passo 2: encontra itens inválidos (produto excluído ou sem preço)
  const todosItens = await db
    .select({ id: shoppingListItems.id, productId: shoppingListItems.productId })
    .from(shoppingListItems)
    .where(baseWhere)

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
    listId: shoppingListItems.listId,
    customName: shoppingListItems.customName, quantity: shoppingListItems.quantity,
    unit: shoppingListItems.unit, checked: shoppingListItems.checked,
    alertPrice: shoppingListItems.alertPrice,
    sortOrder: shoppingListItems.sortOrder,
    productName: products.name, productBrand: products.brand, productUnit: products.unit,
    categoryName: categories.name,
  })
    .from(shoppingListItems)
    .leftJoin(products, eq(shoppingListItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(baseWhere)
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
  .inputValidator((d: { productId?: string; customName?: string; quantity?: number; unit?: string; listId?: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const [item] = await db.insert(shoppingListItems).values({
      userId,
      listId: data.listId || null,
      productId: data.productId || null,
      customName: data.customName || null,
      quantity: data.quantity ?? 1,
      unit: data.unit || null,
    }).returning()
    return item
  })

export const definirAlertaPreco = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; alertPrice: number | null }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    await db.update(shoppingListItems)
      .set({ alertPrice: data.alertPrice !== null ? String(data.alertPrice) : null })
      .where(and(eq(shoppingListItems.id, data.id), eq(shoppingListItems.userId, userId)))
    return { ok: true }
  })

export const atualizarQuantidadeItem = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; quantity: number; unit: string | null }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    await db.update(shoppingListItems)
      .set({ quantity: String(data.quantity), unit: data.unit })
      .where(and(eq(shoppingListItems.id, data.id), eq(shoppingListItems.userId, userId)))
    return { ok: true }
  })

export const toggleItemLista = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; checked: boolean }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    await db.update(shoppingListItems)
      .set({ checked: data.checked })
      .where(and(eq(shoppingListItems.id, data.id), eq(shoppingListItems.userId, userId)))
    return { ok: true }
  })

export const removerItemLista = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    await db.delete(shoppingListItems)
      .where(and(eq(shoppingListItems.id, data.id), eq(shoppingListItems.userId, userId)))
    return { ok: true }
  })

export const limparListaMarcados = createServerFn({ method: 'POST' }).handler(async ({ request }) => {
  const userId = await requireUserId(request)
  await db.delete(shoppingListItems)
    .where(and(eq(shoppingListItems.userId, userId), eq(shoppingListItems.checked, true)))
  return { ok: true }
})

export const buscarMelhorPrecoLista = createServerFn({ method: 'GET' }).handler(async ({ request }) => {
  const userId = await requireUserId(request)

  const itens = await db.select({
    id: shoppingListItems.id, productId: shoppingListItems.productId,
    quantity: shoppingListItems.quantity, checked: shoppingListItems.checked,
    productName: products.name, productBrand: products.brand,
  })
    .from(shoppingListItems)
    .leftJoin(products, eq(shoppingListItems.productId, products.id))
    .where(and(eq(shoppingListItems.userId, userId), eq(shoppingListItems.checked, false)))

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
