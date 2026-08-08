// Wrapper fino para a API de Assinaturas do Mercado Pago (Preapproval), sem plano associado.
// https://www.mercadopago.com.co/developers/en/reference/online-payments/subscriptions/create-preapproval/post
// Auth via header Authorization: Bearer <access token> (diferente do Asaas, que usa header access_token).

const MP_API_BASE = 'https://api.mercadopago.com'

function accessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurada')
  return token
}

async function mpRequest<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Mercado Pago API ${res.status} ${path}: ${body}`)
  }

  return res.json() as Promise<T>
}

// SUBSCRIPTION_PRICE_OVERRIDE permite testar uma cobrança real de valor baixo em produção
// (ex: validar o webhook do Mercado Pago de ponta a ponta) sem tocar no preço de verdade —
// configurar e depois apagar a env var no painel da Vercel, sem precisar mexer em código.
export const SUBSCRIPTION_PRICE = Number(process.env.SUBSCRIPTION_PRICE_OVERRIDE) || 19.9

export interface CreatePreapprovalResult {
  preapprovalId: string
  checkoutUrl: string
}

// value em reais (ex: 19.90). Cobrança recorrente mensal via cartão de crédito — o Preapproval
// do Mercado Pago não tem cobrança recorrente nativa por Pix/boleto, só cartão. startDate: data
// da primeira cobrança (ISO), no fluxo de trial é o dia em que o teste grátis vence.
export async function createPreapproval(
  payerEmail: string,
  userId: string,
  value: number,
  startDate: string,
  backUrl: string,
): Promise<CreatePreapprovalResult> {
  const preapproval = await mpRequest<any>('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason: 'Supermercado Fácil — assinatura mensal',
      external_reference: userId,
      payer_email: payerEmail,
      back_url: backUrl,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: value,
        currency_id: 'BRL',
        start_date: startDate,
      },
    }),
  })

  if (!preapproval?.id || !preapproval?.init_point) {
    throw new Error(`Resposta inesperada do Mercado Pago ao criar assinatura: ${JSON.stringify(preapproval)}`)
  }

  return { preapprovalId: preapproval.id, checkoutUrl: preapproval.init_point }
}

// Fonte da verdade de status — nunca decidir só pelo payload do webhook, sempre confirmar aqui.
// status possíveis: pending | authorized | paused | cancelled.
export async function getPreapproval(preapprovalId: string): Promise<{ status: string; initPoint: string | null }> {
  const data = await mpRequest<any>(`/preapproval/${preapprovalId}`)
  return { status: data.status, initPoint: data.init_point ?? null }
}

// Verificação da assinatura HMAC-SHA256 do header x-signature (formato "ts=...,v1=...")
// contra o segredo cadastrado no painel do Mercado Pago (Webhooks → Configurar notificações).
// manifest = "id:<dataId>;request-id:<requestId>;ts:<timestamp>;"
export async function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) throw new Error('MP_WEBHOOK_SECRET não configurada')
  if (!xSignature || !xRequestId) return false

  const parts = Object.fromEntries(
    xSignature.split(',').map(p => p.trim().split('=').map(s => s.trim())) as [string, string][],
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const computed = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

  return computed === v1
}
