import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { categories } from '#/db/schema'
import { eq, asc } from 'drizzle-orm'

export const listarCategorias = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name))
})

export const criarCategoria = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { name: string; slug: string; icon?: string; color?: string; sortOrder?: number } }) => {
  const [c] = await db.insert(categories).values({
    name: data.name, slug: data.slug,
    icon: data.icon || null, color: data.color || null,
    sortOrder: data.sortOrder ?? 0,
  }).returning()
  return c
})

export const atualizarCategoria = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { id: string; name: string; slug: string; icon?: string; color?: string; sortOrder?: number } }) => {
  const [c] = await db.update(categories)
    .set({ name: data.name, slug: data.slug, icon: data.icon || null, color: data.color || null, sortOrder: data.sortOrder ?? 0 })
    .where(eq(categories.id, data.id))
    .returning()
  return c
})

export const excluirCategoria = createServerFn({ method: 'POST' }).handler(async ({ data }: { data: { id: string } }) => {
  await db.delete(categories).where(eq(categories.id, data.id))
  return { ok: true }
})
