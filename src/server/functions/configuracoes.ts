import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { userSettings } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserId } from '#/server/get-user'

export const obterConfiguracoes = createServerFn({ method: 'GET' }).handler(async ({ request }) => {
  const userId = await requireUserId(request)
  const [config] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1)
  return config ?? { userId, monthlyBudget: null }
})

export const salvarConfiguracoes = createServerFn({ method: 'POST' })
  .inputValidator((d: { monthlyBudget: number | null }) => d)
  .handler(async ({ data, request }) => {
    const userId = await requireUserId(request)
    const val = data.monthlyBudget !== null ? String(data.monthlyBudget) : null
    await db.insert(userSettings)
      .values({ userId, monthlyBudget: val })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { monthlyBudget: val, updatedAt: new Date() },
      })
    return { ok: true }
  })
