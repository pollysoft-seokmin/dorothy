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

// Google ID 토큰에는 `picture`(프로필 이미지) 클레임이 빠지는 경우가 있어,
// better-auth 기본 동작(ID 토큰 디코드)만으로는 user.image 가 null 이 된다.
// userinfo 엔드포인트는 picture 를 안정적으로 제공하므로 여기서 직접 가져온다.
// 네트워크 실패 등으로 userinfo 가 안 되면 ID 토큰 디코드로 폴백한다.
type GoogleProfile = {
  sub: string
  name?: string
  email?: string
  picture?: string
  email_verified?: boolean
}

function decodeIdTokenPayload(idToken?: string): GoogleProfile | null {
  if (!idToken) return null
  const part = idToken.split('.')[1]
  if (!part) return null
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as GoogleProfile
  } catch {
    return null
  }
}

async function fetchGoogleUserInfo(token: {
  accessToken?: string
  idToken?: string
}) {
  let profile: GoogleProfile | null = null
  if (token.accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      })
      if (res.ok) profile = (await res.json()) as GoogleProfile
    } catch {
      profile = null
    }
  }
  // userinfo 실패 시 ID 토큰 폴백 (better-auth 기본과 동일한 소스)
  if (!profile) profile = decodeIdTokenPayload(token.idToken)
  if (!profile?.sub) return null
  return {
    user: {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
      emailVerified: profile.email_verified ?? false,
    },
    data: profile,
  }
}

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
  socialProviders:
    googleOAuthConfig
      ? {
          google: {
            clientId: googleOAuthConfig.clientId,
            clientSecret: googleOAuthConfig.clientSecret,
            accessType: 'offline',
            prompt: 'consent',
            getUserInfo: fetchGoogleUserInfo,
          },
        }
      : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
})

export type Auth = typeof auth
