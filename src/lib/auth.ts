import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '#/db'
import * as schema from '#/db/schema'
import { sendPasswordResetEmail, sendTrialWelcomeEmail } from './email'

const APP_URL = process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL ? 'https://supermercado.nexusteck.com.br' : 'http://localhost:3000')

const TRIAL_DAYS = 7

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // A página de redefinição é a nossa própria (/redefinir-senha, lê ?token= da URL),
    // não a rota default do better-auth — por isso montamos a URL a partir do token,
    // ignorando o `url` que o better-auth geraria pra rota dele.
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${APP_URL}/redefinir-senha?token=${token}`
      await sendPasswordResetEmail(user.email, resetUrl)
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  account: {
    accountLinking: {
      requireLocalEmailVerified: false,
      trustedProviders: ['google'],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  // Cria a assinatura em teste grátis assim que o usuário é criado — cobre cadastro por
  // e-mail/senha e login social (Google também cria usuário na primeira vez), sem precisar
  // de um passo manual separado depois do signup.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
          await db.insert(schema.subscriptions).values({
            userId: user.id,
            status: 'trial',
            trialEndsAt,
          })
          await sendTrialWelcomeEmail(user.email, user.name, trialEndsAt.toISOString()).catch(err =>
            console.error('[auth] falha ao enviar e-mail de boas-vindas:', err instanceof Error ? err.message : err)
          )
        },
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: APP_URL,
  trustedOrigins: [
    'http://localhost:3000',
    'https://supermercado.nexusteck.com.br',
    'https://supermercado-facil.vercel.app',
  ],
})

export type Session = typeof auth.$Infer.Session
