import { createAPIFileRoute } from '@tanstack/react-start/api'
import { db } from '#/db'
import { subscriptions, user } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { getPreapproval, verifyWebhookSignature } from '#/lib/mercadopago-client'
import { sendPaymentOverdueEmail, sendSubscriptionConfirmedEmail } from '#/lib/email'

// Job de fundo cross-tenant (recebe notificação de qualquer assinatura, não passa por sessão
// de usuário logado) — nunca confia no corpo recebido pra decidir status: sempre confirma
// buscando o preapproval direto na API do Mercado Pago antes de atualizar o banco.
export const APIRoute = createAPIFileRoute('/api/webhooks/mercadopago')({
  POST: async ({ request }) => {
    const bodyText = await request.text()
    let payload: any = {}
    try { payload = JSON.parse(bodyText) } catch { /* alguns eventos chegam só via query string */ }

    const url = new URL(request.url)
    const type = payload?.type ?? url.searchParams.get('type') ?? ''
    const dataId = payload?.data?.id ?? url.searchParams.get('data.id') ?? ''

    if (!dataId || !type.includes('preapproval')) {
      return Response.json({ ok: true, ignored: true })
    }

    if (process.env.MP_WEBHOOK_SECRET) {
      const valid = await verifyWebhookSignature(
        request.headers.get('x-signature'), request.headers.get('x-request-id'), dataId,
      )
      if (!valid) return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401 })
    }

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.mpPreapprovalId, dataId)).limit(1)
    if (!sub) return Response.json({ ok: true, ignored: true, reason: 'assinatura não encontrada' })

    const { status } = await getPreapproval(dataId)

    if (status === 'authorized') {
      if (sub.status === 'ativa') return Response.json({ ok: true, ignored: true, reason: 'já ativa' })
      await db.update(subscriptions).set({ status: 'ativa', trialEndsAt: null }).where(eq(subscriptions.userId, sub.userId))

      const [u] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, sub.userId)).limit(1)
      if (u) sendSubscriptionConfirmedEmail(u.email, u.name).catch(() => {})
      return Response.json({ ok: true, activated: true })
    }

    if (status === 'cancelled' || status === 'paused') {
      if (sub.status !== 'ativa') return Response.json({ ok: true, ignored: true, reason: `status atual: ${sub.status}` })
      await db.update(subscriptions).set({ status: 'expirada' }).where(eq(subscriptions.userId, sub.userId))

      const [u] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, sub.userId)).limit(1)
      if (u) {
        const checkoutUrl = status === 'paused' ? await getPreapproval(dataId).then(p => p.initPoint).catch(() => null) : null
        sendPaymentOverdueEmail(u.email, u.name, checkoutUrl).catch(() => {})
      }
      return Response.json({ ok: true, expired: true })
    }

    return Response.json({ ok: true, ignored: true, reason: `status mp: ${status}` })
  },
})
