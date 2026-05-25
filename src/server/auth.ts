import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db/client'
import {
  account as accountTable,
  session as sessionTable,
  user as userTable,
  verification as verificationTable,
} from './db/schema'
import { getGoogleOAuthConfig } from './oauth'

const trustedOriginsRaw = process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? ''
const trustedOrigins = trustedOriginsRaw
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const googleOAuthConfig = getGoogleOAuthConfig()

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: userTable,
      session: sessionTable,
      account: accountTable,
      verification: verificationTable,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  socialProviders:
    googleOAuthConfig
      ? {
          google: {
            clientId: googleOAuthConfig.clientId,
            clientSecret: googleOAuthConfig.clientSecret,
          },
        }
      : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
})

export type Auth = typeof auth
