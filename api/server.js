import server from '../dist/server/server.js'

export default async function handler(req, res) {
  try {
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
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk))
      }
      if (chunks.length > 0) body = Buffer.concat(chunks)
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: body ?? undefined,
    })

    const response = await server.fetch(request)

    res.statusCode = response.status
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value)
    }

    const buffer = await response.arrayBuffer()
    res.end(Buffer.from(buffer))
  } catch (err) {
    console.error('[api/server] crash:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message, stack: err.stack }))
  }
}
