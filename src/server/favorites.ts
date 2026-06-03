import { createServerFn } from '@tanstack/react-start'

const isToggleInput = (v: unknown): v is { mediaAssetId: string } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.mediaAssetId === 'string' && o.mediaAssetId.length > 0
}

const isReorderInput = (v: unknown): v is { orderedIds: string[] } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    Array.isArray(o.orderedIds) &&
    o.orderedIds.every((x) => typeof x === 'string' && x.length > 0)
  )
}

function basenameNoExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? name : name.slice(0, dot)
}

async function requireUser() {
  const { getCurrentSession } = await import('./session')
  const session = await getCurrentSession()
  if (!session?.user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return session.user
}

// 즐겨찾기 목록 — position 오름차순. 각 자산의 sibling LRC(같은 폴더·동일 stem)를
// 라이브러리/최근재생과 동일하게 짝지어 lrcUrl 을 함께 반환한다(가사 사이드카 폴백).
export const getFavorites = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { favorite, mediaAsset } = await import('./db/schema')
    const { and, asc, eq } = await import('drizzle-orm')

    const rows = await db
      .select({
        id: favorite.id,
        mediaAssetId: mediaAsset.id,
        name: mediaAsset.name,
        mediaType: mediaAsset.mediaType,
        blobUrl: mediaAsset.blobUrl,
        folderId: mediaAsset.folderId,
        position: favorite.position,
      })
      .from(favorite)
      .innerJoin(mediaAsset, eq(favorite.mediaAssetId, mediaAsset.id))
      .where(eq(favorite.userId, user.id))
      .orderBy(asc(favorite.position))

    // 가사 자산을 한 번에 받아 (folderId, stem) 으로 매칭 — 즐겨찾기별 개별 쿼리 회피.
    const lyrics = await db
      .select({
        name: mediaAsset.name,
        blobUrl: mediaAsset.blobUrl,
        folderId: mediaAsset.folderId,
      })
      .from(mediaAsset)
      .where(and(eq(mediaAsset.userId, user.id), eq(mediaAsset.mediaType, 'lyrics')))

    return rows.map((r) => {
      const stem = basenameNoExt(r.name)
      const sibling = lyrics.find(
        (l) => l.folderId === r.folderId && basenameNoExt(l.name) === stem,
      )
      return {
        id: r.id,
        mediaAssetId: r.mediaAssetId,
        name: r.name,
        mediaType: r.mediaType === 'video' ? ('video' as const) : ('audio' as const),
        blobUrl: r.blobUrl,
        lrcUrl: sibling?.blobUrl,
        position: r.position,
      }
    })
  },
)

// 토글 — 이미 즐겨찾기면 삭제, 아니면 (max position + 1) 로 끝에 추가.
// 추가 시 자산이 본인 소유의 audio/video 인지 검증한다.
export const toggleFavorite = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isToggleInput(data)) throw new Error('Invalid favorite payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { favorite, mediaAsset } = await import('./db/schema')
    const { and, eq, inArray, sql } = await import('drizzle-orm')

    const [existing] = await db
      .select({ id: favorite.id })
      .from(favorite)
      .where(
        and(
          eq(favorite.userId, user.id),
          eq(favorite.mediaAssetId, data.mediaAssetId),
        ),
      )
      .limit(1)

    if (existing) {
      await db.delete(favorite).where(eq(favorite.id, existing.id))
      return { favorited: false as const }
    }

    const [asset] = await db
      .select({
        id: mediaAsset.id,
        name: mediaAsset.name,
        mediaType: mediaAsset.mediaType,
        blobUrl: mediaAsset.blobUrl,
        folderId: mediaAsset.folderId,
      })
      .from(mediaAsset)
      .where(
        and(
          eq(mediaAsset.id, data.mediaAssetId),
          eq(mediaAsset.userId, user.id),
          inArray(mediaAsset.mediaType, ['audio', 'video']),
        ),
      )
      .limit(1)
    if (!asset) throw new Response('Asset not found', { status: 404 })

    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${favorite.position}), -1)::int` })
      .from(favorite)
      .where(eq(favorite.userId, user.id))
    const position = Number(max ?? -1) + 1

    const id = crypto.randomUUID()
    await db.insert(favorite).values({
      id,
      userId: user.id,
      mediaAssetId: asset.id,
      position,
    })

    // sibling LRC 매칭 — getFavorites 와 동일 규칙.
    const stem = basenameNoExt(asset.name)
    const folderClause =
      asset.folderId === null
        ? sql`${mediaAsset.folderId} is null`
        : eq(mediaAsset.folderId, asset.folderId)
    const siblings = await db
      .select({ name: mediaAsset.name, blobUrl: mediaAsset.blobUrl })
      .from(mediaAsset)
      .where(
        and(
          eq(mediaAsset.userId, user.id),
          eq(mediaAsset.mediaType, 'lyrics'),
          folderClause,
        ),
      )
    const sibling = siblings.find((s) => basenameNoExt(s.name) === stem)

    return {
      favorited: true as const,
      item: {
        id,
        mediaAssetId: asset.id,
        name: asset.name,
        mediaType: asset.mediaType === 'video' ? ('video' as const) : ('audio' as const),
        blobUrl: asset.blobUrl,
        lrcUrl: sibling?.blobUrl,
        position,
      },
    }
  })

// 순서 재배치 — orderedIds 는 favorite.id 의 새 순서. 본인 소유 행만 0..n-1 로
// 재할당한다. orderedIds 에 없는 행은 건드리지 않으나, 클라이언트는 항상 전체
// 목록을 보내므로 누락은 발생하지 않는다.
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
            ),
          )
      }
    })

    return { ok: true }
  })
