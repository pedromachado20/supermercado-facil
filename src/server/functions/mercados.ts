import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { supermarkets, ingestionJobs, shoppingListItems } from '#/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { requireUserId } from '#/server/get-user'

export const listarMercados = createServerFn({ method: 'GET' }).handler(async ({ request }) => {
  const userId = await requireUserId(request)
  return db.select().from(supermarkets)
    .where(eq(supermarkets.userId, userId))
    .orderBy(desc(supermarkets.createdAt))
})

export const criarMercado = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; websiteUrl?: string; address?: string; city?: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const [m] = await db.insert(supermarkets).values({
      name: data.name,
      userId,
      websiteUrl: data.websiteUrl || null,
      address: data.address || null,
      city: data.city || null,
    }).returning()
    return m
  })

export const atualizarMercado = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; name: string; websiteUrl?: string; address?: string; city?: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const [m] = await db.update(supermarkets)
      .set({ name: data.name, websiteUrl: data.websiteUrl || null, address: data.address || null, city: data.city || null })
      .where(and(eq(supermarkets.id, data.id), eq(supermarkets.userId, userId)))
      .returning()
    return m
  })

export const excluirMercado = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    await db.delete(ingestionJobs).where(
      and(eq(ingestionJobs.supermarketId, data.id), eq(ingestionJobs.userId, userId))
    )
    await db.update(shoppingListItems)
      .set({ preferredSupermarketId: null })
      .where(and(eq(shoppingListItems.preferredSupermarketId, data.id), eq(shoppingListItems.userId, userId)))
    await db.delete(supermarkets).where(and(eq(supermarkets.id, data.id), eq(supermarkets.userId, userId)))
    return { ok: true }
  })
