import { auth } from '#/lib/auth'

export async function requireUserId(request: Request): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Não autenticado')
  return session.user.id
}
