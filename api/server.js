import server from '../dist/server/server.js'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core'

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
  trialEndsAt: timestamp('trial_ends_at'),
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
