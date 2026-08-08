import server from '../dist/server/server.js'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { eq, and, gte, lte, isNull } from 'drizzle-orm'

// Schema inline — espelha src/db/schema.ts
const userTable = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})
const sessionTable = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull(),
})
const accountTable = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})
const verificationTable = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})
// status é um enum no Postgres (subscription_status) — texto aqui é suficiente, o banco valida.
const subscriptionsTable = pgTable('subscriptions', {
  userId: text('user_id').primaryKey(),
  status: text('status').notNull(),
  mpPreapprovalId: text('mp_preapproval_id'),
  trialEndsAt: timestamp('trial_ends_at'),
  trialWarningSentAt: timestamp('trial_warning_sent_at'),
})

const db = drizzle(neon(process.env.DATABASE_URL), {
  schema: { user: userTable, session: sessionTable, account: accountTable, verification: verificationTable },
})

const APP_URL = process.env.BETTER_AUTH_URL || 'https://supermercado.nexusteck.com.br'
const TRIAL_DAYS = 7
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'Supermercado Fácil <onboarding@nexusteck.com.br>'
const SUPPORT_EMAIL = 'nexusteckbr@gmail.com'

// Duplicado de src/lib/email.ts — este arquivo roda fora do bundle Vite/TS (handler Node cru
// da Vercel), por isso não pode importar TS. Mantém só o essencial (texto simples, sem HTML rico).
async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY não configurada — pulando envio para ${to}: ${subject}`)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    })
    if (!res.ok) console.error(`[email] Falha ao enviar para ${to}: ${res.status} ${await res.text()}`)
  } catch (err) {
    console.error('[email] erro ao enviar:', err instanceof Error ? err.message : err)
  }
}

// ─── Mercado Pago — duplicado de src/lib/mercadopago-client.ts (mesmo motivo: este arquivo
// roda fora do bundle Vite/TS, precisa ser JS puro importável direto pelo Node da Vercel) ────

const MP_API_BASE = 'https://api.mercadopago.com'

async function mpRequest(path, init) {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurada')
  const res = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`Mercado Pago API ${res.status} ${path}: ${await res.text()}`)
  return res.json()
}

const SUBSCRIPTION_PRICE = Number(process.env.SUBSCRIPTION_PRICE_OVERRIDE) || 19.9

async function createPreapproval(payerEmail, userId, value, startDate, backUrl) {
  const preapproval = await mpRequest('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason: 'Supermercado Fácil — assinatura mensal',
      external_reference: userId,
      payer_email: payerEmail,
      back_url: backUrl,
      status: 'pending',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: value, currency_id: 'BRL', start_date: startDate },
    }),
  })
  if (!preapproval?.id || !preapproval?.init_point) {
    throw new Error(`Resposta inesperada do Mercado Pago ao criar assinatura: ${JSON.stringify(preapproval)}`)
  }
  return { preapprovalId: preapproval.id, checkoutUrl: preapproval.init_point }
}

async function getPreapproval(preapprovalId) {
  const data = await mpRequest(`/preapproval/${preapprovalId}`)
  return { status: data.status, initPoint: data.init_point ?? null }
}

async function verifyWebhookSignature(xSignature, xRequestId, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) throw new Error('MP_WEBHOOK_SECRET não configurada')
  if (!xSignature || !xRequestId) return false
  const parts = Object.fromEntries(xSignature.split(',').map((p) => p.trim().split('=').map((s) => s.trim())))
  if (!parts.ts || !parts.v1) return false
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${parts.ts};`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return computed === parts.v1
}

// ─── Webhook do Mercado Pago (POST /api/webhooks/mercadopago) ────────────────────────────────
// Duplicado de src/routes/api/webhooks/mercadopago.ts — createAPIFileRoute não gera rota
// funcional nesta versão do TanStack Start (ver nota no topo do arquivo), então o despacho
// precisa acontecer aqui, igual ao /api/auth.

async function handleMercadoPagoWebhook(request) {
  let payload = {}
  try { payload = JSON.parse(await request.text()) } catch { /* alguns eventos só via query string */ }

  const url = new URL(request.url)
  const type = payload?.type ?? url.searchParams.get('type') ?? ''
  const dataId = payload?.data?.id ?? url.searchParams.get('data.id') ?? ''

  if (!dataId || !type.includes('preapproval')) return Response.json({ ok: true, ignored: true })

  if (process.env.MP_WEBHOOK_SECRET) {
    const valid = await verifyWebhookSignature(request.headers.get('x-signature'), request.headers.get('x-request-id'), dataId)
    if (!valid) return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401 })
  }

  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.mpPreapprovalId, dataId)).limit(1)
  if (!sub) return Response.json({ ok: true, ignored: true, reason: 'assinatura não encontrada' })

  const { status } = await getPreapproval(dataId)

  if (status === 'authorized') {
    if (sub.status === 'ativa') return Response.json({ ok: true, ignored: true, reason: 'já ativa' })
    await db.update(subscriptionsTable).set({ status: 'ativa', trialEndsAt: null }).where(eq(subscriptionsTable.userId, sub.userId))
    const [u] = await db.select({ email: userTable.email, name: userTable.name }).from(userTable).where(eq(userTable.id, sub.userId)).limit(1)
    if (u) sendEmail(u.email, 'Assinatura confirmada — obrigado!', `<p>Olá, ${u.name}!</p><p>Recebemos seu pagamento. Sua assinatura do Supermercado Fácil está confirmada.</p>`)
    return Response.json({ ok: true, activated: true })
  }

  if (status === 'cancelled' || status === 'paused') {
    if (sub.status !== 'ativa') return Response.json({ ok: true, ignored: true, reason: `status atual: ${sub.status}` })
    await db.update(subscriptionsTable).set({ status: 'expirada' }).where(eq(subscriptionsTable.userId, sub.userId))
    const [u] = await db.select({ email: userTable.email, name: userTable.name }).from(userTable).where(eq(userTable.id, sub.userId)).limit(1)
    if (u) {
      const checkoutUrl = status === 'paused' ? await getPreapproval(dataId).then((p) => p.initPoint).catch(() => null) : null
      sendEmail(u.email, 'Cobrança em atraso — acesso bloqueado', `<p>Olá, ${u.name}!</p><p>Não identificamos o pagamento da sua assinatura e o acesso foi bloqueado.</p>${checkoutUrl ? `<p><a href="${checkoutUrl}">${checkoutUrl}</a></p>` : ''}`)
    }
    return Response.json({ ok: true, expired: true })
  }

  return Response.json({ ok: true, ignored: true, reason: `status mp: ${status}` })
}

// ─── Cron diário (GET /api/cron/sweep) ────────────────────────────────────────────────────────
// Duplicado de src/routes/api/cron/sweep.ts — mesmo motivo do webhook acima.

async function handleCronSweep(request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return new Response('unauthorized', { status: 401 })
  }

  const now = new Date()
  const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const warning = await db.select({
    userId: subscriptionsTable.userId, trialEndsAt: subscriptionsTable.trialEndsAt,
    mpPreapprovalId: subscriptionsTable.mpPreapprovalId, email: userTable.email, name: userTable.name,
  })
    .from(subscriptionsTable).innerJoin(userTable, eq(userTable.id, subscriptionsTable.userId))
    .where(and(eq(subscriptionsTable.status, 'trial'), gte(subscriptionsTable.trialEndsAt, now), lte(subscriptionsTable.trialEndsAt, in1Day), isNull(subscriptionsTable.trialWarningSentAt)))

  for (const t of warning) {
    let checkoutUrl = null
    try {
      if (!t.mpPreapprovalId) {
        const sub = await createPreapproval(t.email, t.userId, SUBSCRIPTION_PRICE, t.trialEndsAt.toISOString(), `${APP_URL}/assinatura`)
        await db.update(subscriptionsTable).set({ mpPreapprovalId: sub.preapprovalId }).where(eq(subscriptionsTable.userId, t.userId))
        checkoutUrl = sub.checkoutUrl
      } else {
        checkoutUrl = await getPreapproval(t.mpPreapprovalId).then((p) => p.initPoint).catch(() => null)
      }
    } catch (err) { console.error(`[cron] falha ao criar assinatura MP pra ${t.userId}:`, err instanceof Error ? err.message : err) }
    if (checkoutUrl) await sendEmail(t.email, 'Seu teste grátis termina amanhã', `<p>Olá, ${t.name}!</p><p>Seu teste grátis do Supermercado Fácil termina amanhã.</p><p><a href="${checkoutUrl}">${checkoutUrl}</a></p>`)
    await db.update(subscriptionsTable).set({ trialWarningSentAt: now }).where(eq(subscriptionsTable.userId, t.userId))
  }

  const expiring = await db.select({
    userId: subscriptionsTable.userId, trialEndsAt: subscriptionsTable.trialEndsAt,
    mpPreapprovalId: subscriptionsTable.mpPreapprovalId, email: userTable.email, name: userTable.name,
  })
    .from(subscriptionsTable).innerJoin(userTable, eq(userTable.id, subscriptionsTable.userId))
    .where(and(eq(subscriptionsTable.status, 'trial'), lte(subscriptionsTable.trialEndsAt, now)))

  for (const t of expiring) {
    let checkoutUrl = null
    let preapprovalId = t.mpPreapprovalId
    try {
      if (!preapprovalId) {
        const sub = await createPreapproval(t.email, t.userId, SUBSCRIPTION_PRICE, t.trialEndsAt.toISOString(), `${APP_URL}/assinatura`)
        preapprovalId = sub.preapprovalId
        checkoutUrl = sub.checkoutUrl
        await db.update(subscriptionsTable).set({ mpPreapprovalId: preapprovalId }).where(eq(subscriptionsTable.userId, t.userId))
      } else {
        checkoutUrl = await getPreapproval(preapprovalId).then((p) => p.initPoint).catch(() => null)
      }
    } catch (err) { console.error(`[cron] falha ao criar assinatura MP (fallback) pra ${t.userId}:`, err instanceof Error ? err.message : err) }
    if (checkoutUrl) await sendEmail(t.email, 'Seu teste grátis expirou hoje', `<p>Olá, ${t.name}!</p><p>Seu teste grátis do Supermercado Fácil venceu hoje. Assine pra continuar:</p><p><a href="${checkoutUrl}">${checkoutUrl}</a></p>`)
    await db.update(subscriptionsTable).set({ status: 'expirada' }).where(eq(subscriptionsTable.userId, t.userId))
  }

  const overdueCandidates = await db.select({
    userId: subscriptionsTable.userId, mpPreapprovalId: subscriptionsTable.mpPreapprovalId, email: userTable.email, name: userTable.name,
  })
    .from(subscriptionsTable).innerJoin(userTable, eq(userTable.id, subscriptionsTable.userId))
    .where(eq(subscriptionsTable.status, 'ativa'))

  let overdueCount = 0
  for (const t of overdueCandidates) {
    if (!t.mpPreapprovalId) continue
    const { status, initPoint } = await getPreapproval(t.mpPreapprovalId).catch(() => ({ status: 'authorized', initPoint: null }))
    if (status === 'authorized') continue
    await db.update(subscriptionsTable).set({ status: 'expirada' }).where(eq(subscriptionsTable.userId, t.userId))
    overdueCount++
    await sendEmail(t.email, 'Cobrança em atraso — acesso bloqueado', `<p>Olá, ${t.name}!</p><p>Não identificamos o pagamento da sua assinatura.</p>${status === 'paused' && initPoint ? `<p><a href="${initPoint}">${initPoint}</a></p>` : ''}`)
  }

  return Response.json({ ok: true, warned: warning.length, expired: expiring.length, overdue: overdueCount })
}

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user: userTable, session: sessionTable, account: accountTable, verification: verificationTable },
  }),
  emailAndPassword: {
    enabled: true,
    // Espelha src/lib/auth.ts — a página de redefinição é a nossa própria (/redefinir-senha,
    // lê ?token= da URL), não a rota default do better-auth.
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${APP_URL}/redefinir-senha?token=${token}`
      await sendEmail(
        user.email,
        'Redefinir sua senha — Supermercado Fácil',
        `<p>Olá,</p><p>Recebemos um pedido pra redefinir a senha da sua conta no Supermercado Fácil.</p>
         <p><a href="${resetUrl}">${resetUrl}</a></p>
         <p>Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>
         <p style="margin-top:24px;padding-top:16px;border-top:1px solid #ddd;font-size:13px;color:#666">Dúvidas? Fale com a gente por e-mail em <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`,
      )
    },
  },
  // Espelha src/lib/auth.ts — cria a assinatura em teste grátis assim que o usuário é criado
  // (cadastro por e-mail/senha ou login social). Este é o auth que de fato roda em produção
  // pra /api/auth/* (ver handler() abaixo), então o hook precisa estar duplicado aqui também.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
          await db.insert(subscriptionsTable).values({ userId: user.id, status: 'trial', trialEndsAt })
          await sendEmail(
            user.email,
            'Seu Supermercado Fácil está pronto — teste grátis ativado!',
            `<p>Olá, ${user.name}!</p><p>Sua conta foi criada, em teste grátis por ${TRIAL_DAYS} dias.</p>
             <p>Importe os encartes ou links dos supermercados que você usa, compare preços e monte sua lista de compras pelo menor valor.</p>
             <p style="margin-top:24px;padding-top:16px;border-top:1px solid #ddd;font-size:13px;color:#666">Dúvidas? Fale com a gente por e-mail em <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`,
          )
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      // usuários criados com email/senha não têm emailVerified=true no banco
      // esta flag permite vincular login Google à conta existente sem exigir verificação local
      requireLocalEmailVerified: false,
      trustedProviders: ['google'],
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'https://supermercado.nexusteck.com.br',
  trustedOrigins: [
    'http://localhost:3000',
    'https://supermercado.nexusteck.com.br',
    'https://supermercado-facil.vercel.app',
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
})

async function nodeToWebRequest(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = req.headers.host || 'localhost'
  const url = new URL(req.url, `${proto}://${host}`)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (key && value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }
  }
  let body = undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = []
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
    if (chunks.length > 0) body = Buffer.concat(chunks)
  }
  return new Request(url.toString(), { method: req.method, headers, body })
}

async function sendWebResponse(response, res) {
  res.statusCode = response.status
  if (typeof response.headers.getSetCookie === 'function') {
    const setCookies = response.headers.getSetCookie()
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() === 'set-cookie') continue
      res.setHeader(key, value)
    }
    if (setCookies.length > 0) res.setHeader('set-cookie', setCookies)
  } else {
    // fallback — Node.js sem getSetCookie
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value)
    }
  }
  const buffer = await response.arrayBuffer()
  res.end(Buffer.from(buffer))
}

export default async function handler(req, res) {
  try {
    const request = await nodeToWebRequest(req)
    let response
    if (req.url?.startsWith('/api/auth')) {
      response = await auth.handler(request)
      if (response.status >= 400) {
        const body = await response.clone().text()
        console.error('[auth]', response.status, req.url, body)
      }
    } else if (req.url?.startsWith('/api/webhooks/mercadopago')) {
      response = await handleMercadoPagoWebhook(request)
    } else if (req.url?.startsWith('/api/cron/sweep')) {
      response = await handleCronSweep(request)
    } else {
      response = await server.fetch(request)
    }
    await sendWebResponse(response, res)
  } catch (err) {
    console.error('[api/server]', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message, stack: err.stack }))
  }
}
