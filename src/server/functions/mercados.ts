import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { supermarkets } from '#/db/schema'
import { eq, desc } from 'drizzle-orm'

export const listarMercados = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(supermarkets).orderBy(desc(supermarkets.createdAt))
})

export const criarMercado = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; websiteUrl?: string; address?: string; city?: string }) => d)
  .handler(async ({ data }) => {
    const [m] = await db.insert(supermarkets).values({
      name: data.name,
      websiteUrl: data.websiteUrl || null,
      address: data.address || null,
      city: data.city || null,
    }).returning()
    return m
  })

export const atualizarMercado = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; name: string; websiteUrl?: string; address?: string; city?: string }) => d)
  .handler(async ({ data }) => {
    const [m] = await db.update(supermarkets)
      .set({ name: data.name, websiteUrl: data.websiteUrl || null, address: data.address || null, city: data.city || null })
      .where(eq(supermarkets.id, data.id))
      .returning()
    return m
  })

export const excluirMercado = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(supermarkets).where(eq(supermarkets.id, data.id))
    return { ok: true }
  })
