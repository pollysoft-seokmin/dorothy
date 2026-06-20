import { createServerFn } from '@tanstack/react-start'
import { requireUser } from './session'

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
  source?: string | null
  providerFileId?: string | null
  providerLrcFileId?: string | null
  mediaType?: 'audio' | 'video' | null
} => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.fileName === 'string' &&
    o.fileName.length > 0 &&
    (o.source === undefined || o.source === null || typeof o.source === 'string') &&
    (o.providerFileId === undefined ||
      o.providerFileId === null ||
      typeof o.providerFileId === 'string') &&
    (o.providerLrcFileId === undefined ||
      o.providerLrcFileId === null ||
      typeof o.providerLrcFileId === 'string') &&
    (o.mediaType === undefined ||
      o.mediaType === null ||
      o.mediaType === 'audio' ||
      o.mediaType === 'video')
  )
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
      // 로컬 파일 재생 등 출처 미지정은 'local' 로 기록한다. 과거엔 'google_drive'
      // 로 잘못 강제돼 providerFileId 가 없는데도 Drive 파일로 보여 재생 불가
      // 항목이 최근 목록에 노출됐다(#129).
      source: data.source ?? 'local',
      providerFileId: data.providerFileId ?? null,
      providerLrcFileId: data.providerLrcFileId ?? null,
      mediaType: data.mediaType ?? null,
      durationSeconds: data.durationSeconds ?? null,
    })
    return { id }
  })

export const getRecentPlaybacks = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { playbackHistory } = await import('./db/schema')
    const { and, desc, eq, isNotNull } = await import('drizzle-orm')

    // 최근 탭은 클릭 시 재생이 목적이므로, 다시 재생 가능한 Drive 기록만
    // 노출한다. 로컬 재생이나 마이그레이션 이전의 providerFileId 없는 기록은
    // URL 을 복원할 수 없어 제외(#129).
    const rows = await db
      .select({
        id: playbackHistory.id,
        title: playbackHistory.title,
        artist: playbackHistory.artist,
        album: playbackHistory.album,
        fileName: playbackHistory.fileName,
        source: playbackHistory.source,
        providerFileId: playbackHistory.providerFileId,
        providerLrcFileId: playbackHistory.providerLrcFileId,
        mediaType: playbackHistory.mediaType,
        durationSeconds: playbackHistory.durationSeconds,
        lastPlayedAt: playbackHistory.lastPlayedAt,
      })
      .from(playbackHistory)
      .where(
        and(
          eq(playbackHistory.userId, user.id),
          eq(playbackHistory.source, 'google_drive'),
          isNotNull(playbackHistory.providerFileId),
        ),
      )
      .orderBy(desc(playbackHistory.lastPlayedAt))
      .limit(100)

    const seen = new Set<string>()
    const unique = []
    for (const row of rows) {
      const key = `${row.source}:${row.providerFileId}`
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(row)
      if (unique.length >= 20) break
    }
    return unique
  },
)
