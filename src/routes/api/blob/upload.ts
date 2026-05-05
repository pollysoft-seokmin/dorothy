import { createFileRoute } from '@tanstack/react-router'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

const handle = async (request: Request): Promise<Response> => {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { getCurrentSession } = await import('~/server/session')
        const session = await getCurrentSession()
        if (!session?.user) {
          throw new Error('Unauthorized')
        }

        const expectedPrefix = `users/${session.user.id}/`
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error('Invalid pathname scope')
        }

        let size = 0
        let folderId: string | null = null
        if (clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload) as {
              size?: unknown
              folderId?: unknown
            }
            if (typeof parsed.size === 'number' && Number.isFinite(parsed.size)) {
              size = parsed.size
            }
            if (parsed.folderId === null || typeof parsed.folderId === 'string') {
              folderId = parsed.folderId
            }
          } catch {
            throw new Error('Invalid clientPayload')
          }
        }

        const { QUOTA_BYTES } = await import('~/server/storage')
        const { db } = await import('~/server/db/client')
        const { mediaAsset } = await import('~/server/db/schema')
        const { eq, sql } = await import('drizzle-orm')
        const [row] = await db
          .select({
            total: sql<number>`coalesce(sum(${mediaAsset.sizeBytes}), 0)::bigint`,
          })
          .from(mediaAsset)
          .where(eq(mediaAsset.userId, session.user.id))
        const used = Number(row?.total ?? 0)
        if (used + size > QUOTA_BYTES) {
          throw new Error(
            `용량 초과: ${Math.round((used + size) / 1024 / 1024)}MB / ${QUOTA_BYTES / 1024 / 1024}MB`,
          )
        }

        return {
          allowedContentTypes: ['audio/*', 'video/*'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id, folderId }),
        }
      },
      // onUploadCompleted은 의도적으로 미설정.
      // 클라가 upload() 성공 후 confirmUpload server function을 호출해 DB row 생성.
      // (handleUpload는 onUploadCompleted를 넘기면 callbackUrl을 요구하는데, dev에선
      // localhost로 webhook을 못 받으므로 명시적 confirm 경로로 통일.)
    })
    return Response.json(json)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed'
    return Response.json({ error: message }, { status: 400 })
  }
}

export const Route = createFileRoute('/api/blob/upload')({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
})
