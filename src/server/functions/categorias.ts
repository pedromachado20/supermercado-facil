import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { categories, products } from '#/db/schema'
import { eq, asc } from 'drizzle-orm'
import { requireUserId } from '#/server/get-user'

export const listarCategorias = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name))
})

export const criarCategoria = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; slug: string; icon?: string; color?: string; sortOrder?: number }) => d)
  .handler(async ({ data, request }) => {
    await requireUserId(request)
    const [c] = await db.insert(categories).values({
      name: data.name, slug: data.slug,
      icon: data.icon || null, color: data.color || null,
      sortOrder: data.sortOrder ?? 0,
    }).returning()
    return c
  })

export const atualizarCategoria = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; name: string; slug: string; icon?: string; color?: string; sortOrder?: number }) => d)
  .handler(async ({ data, request }) => {
    await requireUserId(request)
    const [c] = await db.update(categories)
      .set({ name: data.name, slug: data.slug, icon: data.icon || null, color: data.color || null, sortOrder: data.sortOrder ?? 0 })
      .where(eq(categories.id, data.id))
      .returning()
    return c
  })

export const excluirCategoria = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, request }) => {
    await requireUserId(request)
    await db.update(products).set({ categoryId: null }).where(eq(products.categoryId, data.id))
    await db.delete(categories).where(eq(categories.id, data.id))
    return { ok: true }
  })
