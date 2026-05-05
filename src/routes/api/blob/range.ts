import { createFileRoute } from '@tanstack/react-router'

// Vercel Blob 공개 URL의 호스트네임 패턴.
// 사용자가 임의 URL을 프록시하지 못하도록 화이트리스트로 사용 (SSRF 방지).
const BLOB_HOST_RE = /\.public\.blob\.vercel-storage\.com$/

// 단일 요청 최대 범위. SAMI trailer 추출은 1MB로 충분하지만 약간의 여유.
const MAX_BYTES = 16 * 1024 * 1024

const handle = async (request: Request): Promise<Response> => {
  const { getCurrentSession } = await import('~/server/session')
  const session = await getCurrentSession()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const target = searchParams.get('url')
  const bytesRaw = searchParams.get('bytes')
  if (!target || !bytesRaw) {
    return new Response('Missing url or bytes', { status: 400 })
  }
  const bytes = Math.floor(Number(bytesRaw))
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES) {
    return new Response('Invalid bytes', { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }
  if (parsed.protocol !== 'https:' || !BLOB_HOST_RE.test(parsed.hostname)) {
    return new Response('Forbidden host', { status: 403 })
  }
  // 본인 사용자 prefix만 허용. 타 사용자 자산을 임의 프록시할 수 없게.
  const expectedPrefix = `/users/${session.user.id}/`
  if (!parsed.pathname.startsWith(expectedPrefix)) {
    return new Response('Forbidden path', { status: 403 })
  }

  const upstream = await fetch(parsed.toString(), {
    headers: { Range: `bytes=-${bytes}` },
  })
  // Range 미지원 서버가 200으로 전체를 반환하는 경우도 허용 (작은 파일 등).
  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Upstream error', { status: 502 })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'private, max-age=0, no-store',
    },
  })
}

export const Route = createFileRoute('/api/blob/range')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
    },
  },
})
