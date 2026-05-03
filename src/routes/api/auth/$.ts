import { createFileRoute } from '@tanstack/react-router'

const handle = async (request: Request): Promise<Response> => {
  const { auth } = await import('~/server/auth')
  return auth.handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
})
