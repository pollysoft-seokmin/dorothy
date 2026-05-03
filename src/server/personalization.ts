import { createServerFn } from '@tanstack/react-start'

const DEFAULT_PREFS = { volume: 0.8, theme: 'system' as const }

const isPrefsInput = (
  v: unknown,
): v is { volume?: number; theme?: string } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    (o.volume === undefined || typeof o.volume === 'number') &&
    (o.theme === undefined || typeof o.theme === 'string')
  )
}

const isHistoryInput = (
  v: unknown,
): v is {
  fileName: string
  title?: string | null
  artist?: string | null
  album?: string | null
  durationSeconds?: number | null
} => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.fileName === 'string' && o.fileName.length > 0
}

async function requireUser() {
  const { getCurrentSession } = await import('./session')
  const session = await getCurrentSession()
  if (!session?.user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return session.user
}

export const getMyPreferences = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { userPreferences } = await import('./db/schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .limit(1)
    if (!row) return DEFAULT_PREFS
    return { volume: row.volume, theme: row.theme }
  },
)

export const updateMyPreferences = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isPrefsInput(data)) throw new Error('Invalid preferences payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { userPreferences } = await import('./db/schema')
    const next = {
      volume: data.volume ?? DEFAULT_PREFS.volume,
      theme: data.theme ?? DEFAULT_PREFS.theme,
    }
    await db
      .insert(userPreferences)
      .values({ userId: user.id, ...next })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { ...next, updatedAt: new Date() },
      })
    return next
  })

export const appendPlaybackHistory = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isHistoryInput(data)) throw new Error('Invalid history payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { playbackHistory } = await import('./db/schema')
    const id = crypto.randomUUID()
    await db.insert(playbackHistory).values({
      id,
      userId: user.id,
      fileName: data.fileName,
      title: data.title ?? null,
      artist: data.artist ?? null,
      album: data.album ?? null,
      durationSeconds: data.durationSeconds ?? null,
    })
    return { id }
  })

export const getRecentPlaybacks = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { playbackHistory } = await import('./db/schema')
    const { desc, eq } = await import('drizzle-orm')
    const rows = await db
      .select({
        id: playbackHistory.id,
        title: playbackHistory.title,
        artist: playbackHistory.artist,
        album: playbackHistory.album,
        fileName: playbackHistory.fileName,
        durationSeconds: playbackHistory.durationSeconds,
        lastPlayedAt: playbackHistory.lastPlayedAt,
      })
      .from(playbackHistory)
      .where(eq(playbackHistory.userId, user.id))
      .orderBy(desc(playbackHistory.lastPlayedAt))
      .limit(20)
    return rows
  },
)
