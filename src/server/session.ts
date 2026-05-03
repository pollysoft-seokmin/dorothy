import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from './auth'

export async function getCurrentSession() {
  const headers = getRequestHeaders() as unknown as Headers
  return auth.api.getSession({ headers })
}
