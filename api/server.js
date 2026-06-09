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

const db = drizzle(neon(process.env.DATABASE_URL), {
  schema: { user: userTable, session: sessionTable, account: accountTable, verification: verificationTable },
})

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user: userTable, session: sessionTable, account: accountTable, verification: verificationTable },
  }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    'http://localhost:3000',
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
  // Handle Set-Cookie specially — entries() pode mesclar múltiplos cookies
  const setCookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : null
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') continue
    res.setHeader(key, value)
  }
  if (setCookies && setCookies.length > 0) {
    res.setHeader('set-cookie', setCookies)
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
      const isCallback = req.url?.includes('/callback/')
      if (isCallback) {
        const loc = response.headers.get('location')
        const cookies = typeof response.headers.getSetCookie === 'function'
          ? response.headers.getSetCookie()
          : ['(getSetCookie indisponível)']
        console.log('[oauth-callback]', response.status, 'redirect→', loc, 'cookies:', cookies.length)
      }
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
