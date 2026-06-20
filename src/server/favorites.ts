import { createServerFn } from '@tanstack/react-start'
import { driveFileUrl } from '~/lib/google-drive'
import { requireUser } from './session'

const SOURCE = 'google_drive'

type ToggleInput = {
  fileId: string
  name: string
  mediaType: 'audio' | 'video'
  mimeType?: string | null
  lrcFileId?: string | null
}

const isToggleInput = (v: unknown): v is ToggleInput => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.fileId === 'string' &&
    o.fileId.length > 0 &&
    typeof o.name === 'string' &&
    o.name.length > 0 &&
    (o.mediaType === 'audio' || o.mediaType === 'video') &&
    (o.mimeType === undefined || o.mimeType === null || typeof o.mimeType === 'string') &&
    (o.lrcFileId === undefined || o.lrcFileId === null || typeof o.lrcFileId === 'string')
  )
}

const isReorderInput = (v: unknown): v is { orderedIds: string[] } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    Array.isArray(o.orderedIds) &&
    o.orderedIds.every((x) => typeof x === 'string' && x.length > 0)
  )
}


export const getFavorites = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { favorite } = await import('./db/schema')
    const { and, asc, eq, isNotNull } = await import('drizzle-orm')

    const rows = await db
      .select({
        id: favorite.id,
        fileId: favorite.providerFileId,
        lrcFileId: favorite.providerLrcFileId,
        name: favorite.name,
        mediaType: favorite.mediaType,
        mimeType: favorite.mimeType,
        position: favorite.position,
      })
      .from(favorite)
      .where(
        and(
          eq(favorite.userId, user.id),
          eq(favorite.source, SOURCE),
          isNotNull(favorite.providerFileId),
        ),
      )
      .orderBy(asc(favorite.position))

    return rows
      .filter((r) => r.fileId && r.name && (r.mediaType === 'audio' || r.mediaType === 'video'))
      .map((r) => ({
        id: r.id,
        fileId: r.fileId!,
        name: r.name!,
        mediaType: r.mediaType === 'video' ? ('video' as const) : ('audio' as const),
        mimeType: r.mimeType ?? undefined,
        url: driveFileUrl(r.fileId!),
        lrcFileId: r.lrcFileId ?? undefined,
        lrcUrl: r.lrcFileId ? driveFileUrl(r.lrcFileId) : undefined,
        position: r.position,
      }))
  },
)

export const toggleFavorite = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isToggleInput(data)) throw new Error('Invalid favorite payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { favorite } = await import('./db/schema')
    const { and, eq, sql } = await import('drizzle-orm')

    const [existing] = await db
      .select({ id: favorite.id })
      .from(favorite)
      .where(
        and(
          eq(favorite.userId, user.id),
          eq(favorite.source, SOURCE),
          eq(favorite.providerFileId, data.fileId),
        ),
      )
      .limit(1)

    if (existing) {
      await db.delete(favorite).where(eq(favorite.id, existing.id))
      return { favorited: false as const }
    }

    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${favorite.position}), -1)::int` })
      .from(favorite)
      .where(and(eq(favorite.userId, user.id), eq(favorite.source, SOURCE)))
    const position = Number(max ?? -1) + 1

    const id = crypto.randomUUID()
    // 동시 더블탭/중복 요청 경쟁: 위 존재 체크를 둘 다 통과한 뒤 두 insert 가
    // 들어오면 두 번째는 (user_id, source, provider_file_id) unique 를 위반한다.
    // onConflictDoNothing 으로 멱등 처리 — 이미 즐겨찾기된 상태이므로 결과는 동일.
    await db
      .insert(favorite)
      .values({
        id,
        userId: user.id,
        source: SOURCE,
        providerFileId: data.fileId,
        providerLrcFileId: data.lrcFileId ?? null,
        name: data.name,
        mediaType: data.mediaType,
        mimeType: data.mimeType ?? null,
        position,
      })
      .onConflictDoNothing()

    return {
      favorited: true as const,
      item: {
        id,
        fileId: data.fileId,
        name: data.name,
        mediaType: data.mediaType,
        mimeType: data.mimeType ?? undefined,
        url: driveFileUrl(data.fileId),
        lrcFileId: data.lrcFileId ?? undefined,
        lrcUrl: data.lrcFileId ? driveFileUrl(data.lrcFileId) : undefined,
        position,
      },
    }
  })

export const reorderFavorites = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isReorderInput(data)) throw new Error('Invalid reorder payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { favorite } = await import('./db/schema')
    const { and, eq } = await import('drizzle-orm')

    await db.transaction(async (tx) => {
      for (let i = 0; i < data.orderedIds.length; i++) {
        await tx
          .update(favorite)
          .set({ position: i })
          .where(
            and(
              eq(favorite.id, data.orderedIds[i]),
              eq(favorite.userId, user.id),
              eq(favorite.source, SOURCE),
            ),
          )
      }
    })

    return { ok: true }
  })
