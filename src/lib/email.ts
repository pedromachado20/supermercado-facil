// Envio de e-mail via Resend (https://resend.com/docs/api-reference/emails/send-email).
// Se RESEND_API_KEY não estiver configurada, os envios são pulados silenciosamente (logados
// no console) em vez de quebrar o fluxo de cadastro/senha/cobrança.

const RESEND_API_BASE = 'https://api.resend.com'
const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'Supermercado Fácil <onboarding@nexusteck.com.br>'

const SUPPORT_EMAIL = 'nexusteckbr@gmail.com'

const CONTACT_FOOTER = `
  <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 13px; color: #666;">
    Dúvidas? Fale com a gente por e-mail em
    <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
  </p>
`

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY não configurada — pulando envio para ${to}: ${subject}`)
    return
  }

  const res = await fetch(`${RESEND_API_BASE}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  })

  if (!res.ok) {
    console.error(`[email] Falha ao enviar para ${to}: ${res.status} ${await res.text()}`)
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail(
    to,
    'Redefinir sua senha — Supermercado Fácil',
    `
      <p>Olá,</p>
      <p>Recebemos um pedido pra redefinir a senha da sua conta no Supermercado Fácil.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>
      ${CONTACT_FOOTER}
    `,
  )
}

export async function sendTrialWelcomeEmail(to: string, name: string, trialEndsAt: string): Promise<void> {
  await sendEmail(
    to,
    'Seu Supermercado Fácil está pronto — teste grátis ativado!',
    `
      <p>Olá, ${name}!</p>
      <p>Sua conta foi criada, em teste grátis até <strong>${formatDate(trialEndsAt)}</strong>.</p>
      <p>Importe os encartes ou links dos supermercados que você usa, compare preços e monte sua lista de compras pelo menor valor.</p>
      <p>Se quiser continuar depois do teste, é só assinar antes do vencimento. Seus dados continuam guardados — o acesso só fica bloqueado até a assinatura ser confirmada.</p>
      ${CONTACT_FOOTER}
    `,
  )
}

export async function sendTrialEndingSoonEmail(to: string, name: string, checkoutUrl: string, trialEndsAt: string): Promise<void> {
  await sendEmail(
    to,
    'Seu teste grátis termina amanhã',
    `
      <p>Olá, ${name}!</p>
      <p>Seu período de teste grátis do Supermercado Fácil termina amanhã, dia <strong>${formatDate(trialEndsAt)}</strong>.</p>
      <p>Se não assinar até lá, o acesso fica bloqueado até a assinatura ser confirmada (seus dados continuam guardados, nada é apagado).</p>
      <p>Pra continuar sem interrupção, assine agora:</p>
      <p><a href="${checkoutUrl}">${checkoutUrl}</a></p>
      ${CONTACT_FOOTER}
    `,
  )
}

export async function sendTrialExpiredEmail(to: string, name: string, checkoutUrl: string): Promise<void> {
  await sendEmail(
    to,
    'Seu teste grátis expirou hoje',
    `
      <p>Olá, ${name}!</p>
      <p>Seu período de teste grátis do Supermercado Fácil venceu hoje. O acesso ficou bloqueado, mas todos os seus dados continuam guardados.</p>
      <p>Assine agora pra voltar a usar sem perder nada:</p>
      <p><a href="${checkoutUrl}">${checkoutUrl}</a></p>
      ${CONTACT_FOOTER}
    `,
  )
}

export async function sendPaymentOverdueEmail(to: string, name: string, checkoutUrl: string | null): Promise<void> {
  await sendEmail(
    to,
    'Cobrança em atraso — acesso bloqueado',
    `
      <p>Olá, ${name}!</p>
      <p>Não identificamos o pagamento da sua assinatura e o acesso ao Supermercado Fácil foi bloqueado. Seus dados continuam guardados, nada foi apagado.</p>
      ${checkoutUrl ? `<p>Regularize agora pra voltar a usar sem perder nada:</p><p><a href="${checkoutUrl}">${checkoutUrl}</a></p>` : `<p>Fale com a gente pra regularizar o pagamento.</p>`}
      ${CONTACT_FOOTER}
    `,
  )
}

export async function sendSubscriptionConfirmedEmail(to: string, name: string): Promise<void> {
  await sendEmail(
    to,
    'Assinatura confirmada — obrigado!',
    `
      <p>Olá, ${name}!</p>
      <p>Recebemos seu pagamento. Sua assinatura do Supermercado Fácil está confirmada e o acesso continua liberado, sem limite de uso.</p>
      ${CONTACT_FOOTER}
    `,
  )
}
