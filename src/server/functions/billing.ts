import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { subscriptions, user } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserId } from '#/server/get-user'
import { createPreapproval, getPreapproval, SUBSCRIPTION_PRICE } from '#/lib/mercadopago-client'

const APP_URL = process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL ? 'https://supermercado.nexusteck.com.br' : 'http://localhost:3000')

const TRIAL_DAYS = 7

// Contas criadas antes do sistema de assinatura existir (ou qualquer falha silenciosa do
// databaseHooks — ele está duplicado em src/lib/auth.ts e api/server.js, ver nota lá) não têm
// linha em subscriptions. Em vez de quebrar o fluxo, cria o trial na hora.
async function getOrCreateSubscription(userId: string) {
  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1)
  if (existing) return existing

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const [created] = await db.insert(subscriptions)
    .values({ userId, status: 'trial', trialEndsAt })
    .onConflictDoNothing()
    .returning()
  if (created) return created

  // Corrida rara: outra requisição criou entre o select e o insert acima.
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1)
  return row
}

// Preço/trial pra tela pública (landing) — nunca duplicar à mão o que já está em
// mercadopago-client.ts/auth.ts.
export const getPublicPricing = createServerFn({ method: 'GET' }).handler(async () => {
  return { price: SUBSCRIPTION_PRICE, trialDays: TRIAL_DAYS }
})

export const getAssinaturaInfo = createServerFn({ method: 'GET' }).handler(async ({ request }) => {
  const userId = await requireUserId(request, { allowExpired: true })
  const sub = await getOrCreateSubscription(userId)

  let checkoutUrl: string | null = null
  if (sub?.mpPreapprovalId) {
    checkoutUrl = await getPreapproval(sub.mpPreapprovalId).then(p => p.initPoint).catch(() => null)
  }

  return {
    status: sub?.status ?? 'trial',
    trialEndsAt: sub?.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
    checkoutUrl,
  }
})

// Permite ao usuário optar por assinar antes do fim do trial, em vez de esperar o cron gerar
// a cobrança automaticamente perto do vencimento. A data da primeira cobrança continua sendo o
// fim do trial (mesma regra do cron) — pagar antes só garante o link mais cedo.
export const iniciarAssinatura = createServerFn({ method: 'POST' }).handler(async ({ request }) => {
  const userId = await requireUserId(request, { allowExpired: true })
  const sub = await getOrCreateSubscription(userId)
  if (!sub) throw new Error('Não foi possível preparar a assinatura — tente novamente')

  if (sub.mpPreapprovalId) {
    const { initPoint } = await getPreapproval(sub.mpPreapprovalId)
    return { checkoutUrl: initPoint }
  }
  if (sub.status !== 'trial') throw new Error('Assinatura não está em teste grátis')

  const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1)
  if (!u) throw new Error('Usuário não encontrado')

  const startDate = (sub.trialEndsAt ?? new Date()).toISOString()
  const { preapprovalId, checkoutUrl } = await createPreapproval(
    u.email, userId, SUBSCRIPTION_PRICE, startDate, `${APP_URL}/assinatura`,
  )
  await db.update(subscriptions).set({ mpPreapprovalId: preapprovalId }).where(eq(subscriptions.userId, userId))
  return { checkoutUrl }
})

// Confere o status direto na API do Mercado Pago sem esperar o webhook/cron — pro usuário
// que acabou de pagar e quer ver o acesso liberado na hora, sem precisar recarregar depois.
export const verificarPagamento = createServerFn({ method: 'POST' }).handler(async ({ request }) => {
  const userId = await requireUserId(request, { allowExpired: true })
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1)
  if (!sub?.mpPreapprovalId) throw new Error('Nenhuma assinatura encontrada')

  const { status } = await getPreapproval(sub.mpPreapprovalId)
  const pago = status === 'authorized'
  if (pago && sub.status !== 'ativa') {
    await db.update(subscriptions).set({ status: 'ativa', trialEndsAt: null }).where(eq(subscriptions.userId, userId))
  }
  return { pago }
})
