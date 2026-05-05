import { createServerFn } from '@tanstack/react-start'

export const QUOTA_BYTES = 1024 ** 3

const isCreateFolderInput = (
  v: unknown,
): v is { name: string; parentId: string | null } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.name === 'string' &&
    o.name.trim().length > 0 &&
    o.name.length <= 100 &&
    (o.parentId === null || typeof o.parentId === 'string')
  )
}

const isIdInput = (v: unknown): v is { id: string } => {
  if (typeof v !== 'object' || v === null) return false
  return typeof (v as Record<string, unknown>).id === 'string'
}

const isRenameInput = (
  v: unknown,
): v is { id: string; name: string } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    o.name.trim().length > 0 &&
    o.name.length <= 200
  )
}

const isListInput = (v: unknown): v is { folderId: string | null } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return o.folderId === null || typeof o.folderId === 'string'
}

const isConfirmUploadInput = (
  v: unknown,
): v is {
  blobUrl: string
  blobPathname: string
  name: string
  mimeType: string
  sizeBytes: number
  folderId: string | null
} => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.blobUrl === 'string' &&
    typeof o.blobPathname === 'string' &&
    typeof o.name === 'string' &&
    typeof o.mimeType === 'string' &&
    typeof o.sizeBytes === 'number' &&
    Number.isFinite(o.sizeBytes) &&
    o.sizeBytes >= 0 &&
    (o.folderId === null || typeof o.folderId === 'string')
  )
}

async function requireUser() {
  const { getCurrentSession } = await import('./session')
  const session = await getCurrentSession()
  if (!session?.user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return session.user
}

export type LibraryMediaType = 'audio' | 'video' | 'lyrics'

function detectMediaType(name: string, mime: string): LibraryMediaType | null {
  if (name.toLowerCase().endsWith('.lrc')) return 'lyrics'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  return null
}

async function sumUsedBytes(userId: string): Promise<number> {
  const { db } = await import('./db/client')
  const { mediaAsset } = await import('./db/schema')
  const { eq, sql } = await import('drizzle-orm')
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${mediaAsset.sizeBytes}), 0)::bigint`,
    })
    .from(mediaAsset)
    .where(eq(mediaAsset.userId, userId))
  return Number(row?.total ?? 0)
}

export const getStorageUsage = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const used = await sumUsedBytes(user.id)
    return { used, quota: QUOTA_BYTES }
  },
)

export const getFolderTree = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { folder } = await import('./db/schema')
    const { asc, eq } = await import('drizzle-orm')
    const rows = await db
      .select({
        id: folder.id,
        parentId: folder.parentId,
        name: folder.name,
        createdAt: folder.createdAt,
      })
      .from(folder)
      .where(eq(folder.userId, user.id))
      .orderBy(asc(folder.name))
    return rows
  },
)

export const listFolderContents = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    if (!isListInput(data)) throw new Error('Invalid list payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { folder, mediaAsset } = await import('./db/schema')
    const { and, asc, eq, isNull } = await import('drizzle-orm')

    const folderFilter = data.folderId === null
      ? isNull(folder.parentId)
      : eq(folder.parentId, data.folderId)
    const assetFilter = data.folderId === null
      ? isNull(mediaAsset.folderId)
      : eq(mediaAsset.folderId, data.folderId)

    const [folders, assets] = await Promise.all([
      db
        .select({
          id: folder.id,
          name: folder.name,
          createdAt: folder.createdAt,
        })
        .from(folder)
        .where(and(eq(folder.userId, user.id), folderFilter))
        .orderBy(asc(folder.name)),
      db
        .select({
          id: mediaAsset.id,
          name: mediaAsset.name,
          mediaType: mediaAsset.mediaType,
          mimeType: mediaAsset.mimeType,
          sizeBytes: mediaAsset.sizeBytes,
          blobUrl: mediaAsset.blobUrl,
          createdAt: mediaAsset.createdAt,
        })
        .from(mediaAsset)
        .where(and(eq(mediaAsset.userId, user.id), assetFilter))
        .orderBy(asc(mediaAsset.name)),
    ])

    return { folders, assets }
  })

export const createFolder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isCreateFolderInput(data)) throw new Error('Invalid folder payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { folder } = await import('./db/schema')
    const { and, eq } = await import('drizzle-orm')

    if (data.parentId) {
      const [parent] = await db
        .select({ id: folder.id })
        .from(folder)
        .where(and(eq(folder.id, data.parentId), eq(folder.userId, user.id)))
        .limit(1)
      if (!parent) throw new Response('Parent folder not found', { status: 404 })
    }

    const id = crypto.randomUUID()
    const name = data.name.trim()
    try {
      await db.insert(folder).values({
        id,
        userId: user.id,
        parentId: data.parentId,
        name,
      })
    } catch (e: unknown) {
      // drizzle은 원본 pg 에러를 e.cause에 둔다. PG 23505 = unique_violation.
      const cause = (e as { cause?: { code?: string; constraint?: string } }).cause
      if (cause?.code === '23505' && cause?.constraint === 'folder_user_parent_name_unique') {
        throw new Response('같은 위치에 동일한 이름의 폴더가 이미 있습니다', {
          status: 409,
        })
      }
      throw e
    }
    return { id, name, parentId: data.parentId }
  })

export const renameFolder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isRenameInput(data)) throw new Error('Invalid rename payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { folder } = await import('./db/schema')
    const { and, eq } = await import('drizzle-orm')

    const name = data.name.trim()
    try {
      const result = await db
        .update(folder)
        .set({ name })
        .where(and(eq(folder.id, data.id), eq(folder.userId, user.id)))
        .returning({ id: folder.id })
      if (result.length === 0) {
        throw new Response('Folder not found', { status: 404 })
      }
    } catch (e: unknown) {
      if (e instanceof Response) throw e
      const cause = (e as { cause?: { code?: string; constraint?: string } }).cause
      if (cause?.code === '23505' && cause?.constraint === 'folder_user_parent_name_unique') {
        throw new Response('같은 위치에 동일한 이름의 폴더가 이미 있습니다', {
          status: 409,
        })
      }
      throw e
    }
    return { id: data.id, name }
  })

export const renameAsset = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isRenameInput(data)) throw new Error('Invalid rename payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { mediaAsset } = await import('./db/schema')
    const { and, eq } = await import('drizzle-orm')

    const name = data.name.trim()
    const result = await db
      .update(mediaAsset)
      .set({ name })
      .where(and(eq(mediaAsset.id, data.id), eq(mediaAsset.userId, user.id)))
      .returning({ id: mediaAsset.id })
    if (result.length === 0) {
      throw new Response('Asset not found', { status: 404 })
    }
    return { id: data.id, name }
  })

export const deleteFolder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isIdInput(data)) throw new Error('Invalid folder id')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { folder, mediaAsset } = await import('./db/schema')
    const { and, eq, inArray, sql } = await import('drizzle-orm')

    const [target] = await db
      .select({ id: folder.id })
      .from(folder)
      .where(and(eq(folder.id, data.id), eq(folder.userId, user.id)))
      .limit(1)
    if (!target) throw new Response('Folder not found', { status: 404 })

    const descendants = await db.execute<{ id: string }>(sql`
      WITH RECURSIVE descendants AS (
        SELECT id FROM "folder" WHERE id = ${data.id} AND user_id = ${user.id}
        UNION ALL
        SELECT f.id FROM "folder" f
          JOIN descendants d ON f.parent_id = d.id
      )
      SELECT id FROM descendants
    `)
    const descendantIds = descendants.rows.map((r) => r.id)

    const orphanAssets = await db
      .select({ blobUrl: mediaAsset.blobUrl })
      .from(mediaAsset)
      .where(
        and(
          eq(mediaAsset.userId, user.id),
          inArray(mediaAsset.folderId, descendantIds),
        ),
      )

    if (orphanAssets.length > 0) {
      const { del } = await import('@vercel/blob')
      await del(orphanAssets.map((a) => a.blobUrl)).catch(() => {})
    }

    await db
      .delete(folder)
      .where(and(eq(folder.id, data.id), eq(folder.userId, user.id)))

    return { ok: true, deletedAssets: orphanAssets.length }
  })

export const deleteAsset = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isIdInput(data)) throw new Error('Invalid asset id')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { mediaAsset } = await import('./db/schema')
    const { and, eq } = await import('drizzle-orm')

    const [row] = await db
      .select({ blobUrl: mediaAsset.blobUrl })
      .from(mediaAsset)
      .where(and(eq(mediaAsset.id, data.id), eq(mediaAsset.userId, user.id)))
      .limit(1)
    if (!row) throw new Response('Asset not found', { status: 404 })

    const { del } = await import('@vercel/blob')
    await del(row.blobUrl).catch(() => {})

    await db
      .delete(mediaAsset)
      .where(and(eq(mediaAsset.id, data.id), eq(mediaAsset.userId, user.id)))

    return { ok: true }
  })

export const confirmUpload = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isConfirmUploadInput(data)) throw new Error('Invalid upload payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()

    const mediaType = detectMediaType(data.name, data.mimeType)
    if (!mediaType) {
      throw new Response(
        '지원하지 않는 파일 형식입니다 (오디오, 비디오, .lrc만)',
        { status: 400 },
      )
    }

    const expectedPrefix = `users/${user.id}/`
    if (!data.blobPathname.startsWith(expectedPrefix)) {
      throw new Response('Invalid blob path', { status: 400 })
    }

    const used = await sumUsedBytes(user.id)
    if (used + data.sizeBytes > QUOTA_BYTES) {
      const { del } = await import('@vercel/blob')
      await del(data.blobUrl).catch(() => {})
      throw new Response(
        `용량 초과: ${Math.round((used + data.sizeBytes) / 1024 / 1024)}MB / ${QUOTA_BYTES / 1024 / 1024}MB`,
        { status: 413 },
      )
    }

    const { db } = await import('./db/client')
    const { folder, mediaAsset } = await import('./db/schema')
    const { and, eq } = await import('drizzle-orm')

    if (data.folderId) {
      const [parent] = await db
        .select({ id: folder.id })
        .from(folder)
        .where(and(eq(folder.id, data.folderId), eq(folder.userId, user.id)))
        .limit(1)
      if (!parent) throw new Response('Folder not found', { status: 404 })
    }

    const id = crypto.randomUUID()
    await db.insert(mediaAsset).values({
      id,
      userId: user.id,
      folderId: data.folderId,
      name: data.name,
      mediaType,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      blobUrl: data.blobUrl,
      blobPathname: data.blobPathname,
    })

    return { id, blobUrl: data.blobUrl, mediaType }
  })
