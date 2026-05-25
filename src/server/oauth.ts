const readRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export const getGoogleOAuthConfig = () => {
  const clientId = readRequiredEnv('GOOGLE_CLIENT_ID')
  const clientSecret = readRequiredEnv('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) return null

  return { clientId, clientSecret }
}

export const isGoogleOAuthEnabled = () => getGoogleOAuthConfig() !== null
