import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from './auth'

export async function getCurrentSession() {
  const headers = getRequestHeaders() as unknown as Headers
  return auth.api.getSession({ headers })
}

// 인증된 user 를 반환하거나 401 을 throw. server fn / 프록시 라우트 공용.
export async function requireUser() {
  const session = await getCurrentSession()
  if (!session?.user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return session.user
}
