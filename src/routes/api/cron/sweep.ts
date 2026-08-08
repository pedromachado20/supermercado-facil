import { createAPIFileRoute } from '@tanstack/react-start/api'
import { db } from '#/db'
import { subscriptions, user } from '#/db/schema'
import { eq, and, lte, gte, isNull } from 'drizzle-orm'
import { createPreapproval, getPreapproval, SUBSCRIPTION_PRICE } from '#/lib/mercadopago-client'
import { sendPaymentOverdueEmail, sendTrialEndingSoonEmail, sendTrialExpiredEmail } from '#/lib/email'

const APP_URL = process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL ? 'https://supermercado.nexusteck.com.br' : 'http://localhost:3000')

// Varredura diária (cross-tenant) — nunca apaga dado, só marca a assinatura como 'expirada',
// o que bloqueia o acesso via requireUserId() (src/server/get-user.ts). A cobrança/assinatura
// no Mercado Pago só é criada AQUI, perto do fim do trial — não no cadastro — pra quem só
// quer testar não receber e-mail de cobrança de cara.
export const APIRoute = createAPIFileRoute('/api/cron/sweep')({
  GET: async ({ request }) => {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return new Response('unauthorized', { status: 401 })
      }
    }

    const now = new Date()
    const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Aviso 1 dia antes do trial vencer — cria a assinatura MP nesse momento (1ª vez).
    const warning = await db.select({
      userId: subscriptions.userId, trialEndsAt: subscriptions.trialEndsAt,
      mpPreapprovalId: subscriptions.mpPreapprovalId, email: user.email, name: user.name,
    })
      .from(subscriptions).innerJoin(user, eq(user.id, subscriptions.userId))
      .where(and(
        eq(subscriptions.status, 'trial'),
        gte(subscriptions.trialEndsAt, now), lte(subscriptions.trialEndsAt, in1Day),
        isNull(subscriptions.trialWarningSentAt),
      ))

    for (const t of warning) {
      let checkoutUrl: string | null = null
      try {
        if (!t.mpPreapprovalId) {
          const sub = await createPreapproval(t.email, t.userId, SUBSCRIPTION_PRICE, t.trialEndsAt!.toISOString(), `${APP_URL}/assinatura`)
          await db.update(subscriptions).set({ mpPreapprovalId: sub.preapprovalId }).where(eq(subscriptions.userId, t.userId))
          checkoutUrl = sub.checkoutUrl
        } else {
          checkoutUrl = await getPreapproval(t.mpPreapprovalId).then(p => p.initPoint).catch(() => null)
        }
      } catch (err) {
        console.error(`[cron] falha ao criar assinatura MP pra ${t.userId}:`, err instanceof Error ? err.message : err)
      }
      if (checkoutUrl) await sendTrialEndingSoonEmail(t.email, t.name, checkoutUrl, t.trialEndsAt!.toISOString()).catch(() => {})
      await db.update(subscriptions).set({ trialWarningSentAt: now }).where(eq(subscriptions.userId, t.userId))
    }

    // Trial vencido — marca expirada (rede de segurança: cria a assinatura MP aqui também
    // se por algum motivo o cron do dia do aviso não rodou).
    const expiring = await db.select({
      userId: subscriptions.userId, trialEndsAt: subscriptions.trialEndsAt,
      mpPreapprovalId: subscriptions.mpPreapprovalId, email: user.email, name: user.name,
    })
      .from(subscriptions).innerJoin(user, eq(user.id, subscriptions.userId))
      .where(and(eq(subscriptions.status, 'trial'), lte(subscriptions.trialEndsAt, now)))

    for (const t of expiring) {
      let checkoutUrl: string | null = null
      let preapprovalId = t.mpPreapprovalId
      try {
        if (!preapprovalId) {
          const sub = await createPreapproval(t.email, t.userId, SUBSCRIPTION_PRICE, t.trialEndsAt!.toISOString(), `${APP_URL}/assinatura`)
          preapprovalId = sub.preapprovalId
          checkoutUrl = sub.checkoutUrl
          await db.update(subscriptions).set({ mpPreapprovalId: preapprovalId }).where(eq(subscriptions.userId, t.userId))
        } else {
          checkoutUrl = await getPreapproval(preapprovalId).then(p => p.initPoint).catch(() => null)
        }
      } catch (err) {
        console.error(`[cron] falha ao criar assinatura MP (fallback) pra ${t.userId}:`, err instanceof Error ? err.message : err)
      }
      if (checkoutUrl) await sendTrialExpiredEmail(t.email, t.name, checkoutUrl).catch(() => {})
      await db.update(subscriptions).set({ status: 'expirada' }).where(eq(subscriptions.userId, t.userId))
    }

    // Rede de segurança pra assinatura ativa cuja cobrança recorrente falhou: o caminho normal
    // é o webhook (mercadopago.ts), isso só cobre o caso do webhook não ter chegado.
    const overdueCandidates = await db.select({
      userId: subscriptions.userId, mpPreapprovalId: subscriptions.mpPreapprovalId, email: user.email, name: user.name,
    })
      .from(subscriptions).innerJoin(user, eq(user.id, subscriptions.userId))
      .where(and(eq(subscriptions.status, 'ativa')))

    let overdueCount = 0
    for (const t of overdueCandidates) {
      if (!t.mpPreapprovalId) continue
      const { status, initPoint } = await getPreapproval(t.mpPreapprovalId).catch(() => ({ status: 'authorized', initPoint: null }))
      if (status === 'authorized') continue

      await db.update(subscriptions).set({ status: 'expirada' }).where(eq(subscriptions.userId, t.userId))
      overdueCount++
      await sendPaymentOverdueEmail(t.email, t.name, status === 'paused' ? initPoint : null).catch(() => {})
    }

    return Response.json({ ok: true, warned: warning.length, expired: expiring.length, overdue: overdueCount })
  },
})
