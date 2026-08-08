import { auth } from '#/lib/auth'
import { db } from '#/db'
import { subscriptions } from '#/db/schema'
import { eq } from 'drizzle-orm'

export type SubscriptionStatus = 'trial' | 'ativa' | 'expirada'

export class SubscriptionExpiredError extends Error {
  constructor() {
    super('Assinatura expirada')
  }
}

/**
 * Resolve o usuário autenticado e, por padrão, recusa (SubscriptionExpiredError) se a
 * assinatura dele está expirada — passe `{ allowExpired: true }` só nas poucas funções que
 * precisam continuar acessíveis nesse estado (ex: consultar link de cobrança).
 */
export async function requireUserId(request: Request, opts?: { allowExpired?: boolean }): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Não autenticado')

  if (opts?.allowExpired) return session.user.id

  const [sub] = await db.select({ status: subscriptions.status })
    .from(subscriptions).where(eq(subscriptions.userId, session.user.id)).limit(1)

  if (sub?.status === 'expirada') throw new SubscriptionExpiredError()

  return session.user.id
}
