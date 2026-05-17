import { createServerFn } from '@tanstack/react-start'

const VALID_LYRICS_LANGUAGES = ['en-ko', 'en', 'ko'] as const
type LyricsLanguagePref = (typeof VALID_LYRICS_LANGUAGES)[number]

const DEFAULT_PREFS = {
  theme: 'system' as const,
  lyricsLanguage: 'en-ko' as LyricsLanguagePref,
}

function isLyricsLanguage(v: unknown): v is LyricsLanguagePref {
  return (
    typeof v === 'string' &&
    (VALID_LYRICS_LANGUAGES as readonly string[]).includes(v)
  )
}

const isPrefsInput = (
  v: unknown,
): v is { theme?: string; lyricsLanguage?: LyricsLanguagePref } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    (o.theme === undefined || typeof o.theme === 'string') &&
    (o.lyricsLanguage === undefined || isLyricsLanguage(o.lyricsLanguage))
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
    // DB에서 읽은 값이 알 수 없는 코드면 기본값으로 폴백 — 마이그레이션 직후
    // 빈 컬럼이나 사용자가 외부에서 임의로 채워둔 값에 대해 안전.
    const lyricsLanguage = isLyricsLanguage(row.lyricsLanguage)
      ? row.lyricsLanguage
      : DEFAULT_PREFS.lyricsLanguage
    return { theme: row.theme, lyricsLanguage }
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
      theme: data.theme ?? DEFAULT_PREFS.theme,
      lyricsLanguage: data.lyricsLanguage ?? DEFAULT_PREFS.lyricsLanguage,
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
