import server from '../dist/server/server.js'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

// Auth direto com process.env em runtime (não bakeado no build)
const db = drizzle(neon(process.env.DATABASE_URL))
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
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
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value)
  }
  const buffer = await response.arrayBuffer()
  res.end(Buffer.from(buffer))
}

export default async function handler(req, res) {
  try {
    const request = await nodeToWebRequest(req)
    const response = req.url?.startsWith('/api/auth')
      ? await auth.handler(request)
      : await server.fetch(request)
    await sendWebResponse(response, res)
  } catch (err) {
    console.error('[api/server]', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message }))
  }
}
