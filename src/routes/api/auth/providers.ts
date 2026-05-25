import { createFileRoute } from '@tanstack/react-router'

const handle = async (): Promise<Response> => {
  const { isGoogleOAuthEnabled } = await import('~/server/oauth')

  return Response.json({
    google: isGoogleOAuthEnabled(),
  })
}

export const Route = createFileRoute('/api/auth/providers')({
  server: {
    handlers: {
      GET: () => handle(),
    },
  },
})
