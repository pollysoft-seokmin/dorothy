import { createFileRoute } from '@tanstack/react-router'

// upstream(Drive) 상태를 그대로 흘려보낼 코드들. 특히 401/403 은 토큰 만료·권한
// 취소를 뜻하므로 클라이언트가 재연결 흐름을 탈 수 있도록 502 로 뭉개지 않는다.
const PASSTHROUGH_STATUS = new Set([401, 403, 404, 416])

const handle = async (
  request: Request,
  method: 'GET' | 'HEAD',
): Promise<Response> => {
  const { getCurrentSession } = await import('~/server/session')
  const session = await getCurrentSession()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return new Response('Invalid file id', { status: 400 })
  }

  const { getGoogleDriveAccessToken } = await import('~/server/google-drive')
  const token = await getGoogleDriveAccessToken(session.user.id)
  const headers = new Headers({ Authorization: `Bearer ${token}` })
  const range = request.headers.get('range')
  if (range) headers.set('Range', range)

  const upstream = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
    { headers },
  )
  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Google Drive file fetch failed', {
      status: PASSTHROUGH_STATUS.has(upstream.status) ? upstream.status : 502,
    })
  }

  const outHeaders = new Headers()
  for (const key of [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
  ]) {
    const value = upstream.headers.get(key)
    if (value) outHeaders.set(key, value)
  }
  outHeaders.set('Cache-Control', 'private, max-age=0, no-store')

  // HEAD 응답은 body 를 가질 수 없다(일부 런타임은 'HEAD response may not have a
  // body' 로 거부). 헤더만 반환하고 upstream 스트림은 버린다.
  return new Response(method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  })
}

export const Route = createFileRoute('/api/google-drive/file')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request, 'GET'),
      HEAD: ({ request }) => handle(request, 'HEAD'),
    },
  },
})
