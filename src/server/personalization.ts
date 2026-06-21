import { createServerFn } from '@tanstack/react-start'
import { requireUser } from './session'

const VALID_LYRICS_LANGUAGES = ['en-ko', 'en', 'ko'] as const
type LyricsLanguagePref = (typeof VALID_LYRICS_LANGUAGES)[number]

const VALID_VIEW_MODES = ['default', 'split', 'theater'] as const
type ViewModePref = (typeof VALID_VIEW_MODES)[number]

const DEFAULT_PREFS = {
  theme: 'system' as const,
  lyricsLanguage: 'en-ko' as LyricsLanguagePref,
  viewMode: 'default' as ViewModePref,
}

function isLyricsLanguage(v: unknown): v is LyricsLanguagePref {
  return (
    typeof v === 'string' &&
    (VALID_LYRICS_LANGUAGES as readonly string[]).includes(v)
  )
}

function isViewMode(v: unknown): v is ViewModePref {
  return typeof v === 'string' && (VALID_VIEW_MODES as readonly string[]).includes(v)
}

const isPrefsInput = (
  v: unknown,
): v is {
  theme?: string
  lyricsLanguage?: LyricsLanguagePref
  viewMode?: ViewModePref
} => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    (o.theme === undefined || typeof o.theme === 'string') &&
    (o.lyricsLanguage === undefined || isLyricsLanguage(o.lyricsLanguage)) &&
    (o.viewMode === undefined || isViewMode(o.viewMode))
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
    const viewMode = isViewMode(row.viewMode)
      ? row.viewMode
      : DEFAULT_PREFS.viewMode
    return { theme: row.theme, lyricsLanguage, viewMode }
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
      viewMode: data.viewMode ?? DEFAULT_PREFS.viewMode,
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
    // 최근 재생은 다시 재생 가능한 Drive 파일만 의미가 있다. provider_file_id 가
    // 없는 재생(로컬 파일 등)은 URL 복원이 불가하므로 기록하지 않는다(#129).
    const source = data.source ?? 'local'
    if (source !== 'google_drive' || !data.providerFileId) {
      return { skipped: true as const }
    }

    const { db } = await import('./db/client')
    const { playbackHistory } = await import('./db/schema')
    const id = crypto.randomUUID()
    // 파일별 1행 upsert — 같은 파일 재생 시 새 행을 쌓지 않고 last_played_at 과
    // 메타데이터만 갱신한다(append-only 무한증가 제거, #131).
    await db
      .insert(playbackHistory)
      .values({
        id,
        userId: user.id,
        fileName: data.fileName,
        title: data.title ?? null,
        artist: data.artist ?? null,
        album: data.album ?? null,
        source,
        providerFileId: data.providerFileId,
        providerLrcFileId: data.providerLrcFileId ?? null,
        mediaType: data.mediaType ?? null,
        durationSeconds: data.durationSeconds ?? null,
      })
      .onConflictDoUpdate({
        target: [
          playbackHistory.userId,
          playbackHistory.source,
          playbackHistory.providerFileId,
        ],
        set: {
          fileName: data.fileName,
          title: data.title ?? null,
          artist: data.artist ?? null,
          album: data.album ?? null,
          providerLrcFileId: data.providerLrcFileId ?? null,
          mediaType: data.mediaType ?? null,
          durationSeconds: data.durationSeconds ?? null,
          lastPlayedAt: new Date(),
        },
      })
    return { ok: true as const }
  })

export const getRecentPlaybacks = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { playbackHistory } = await import('./db/schema')
    const { and, desc, eq } = await import('drizzle-orm')

    // 파일별 1행 upsert(#131) 라 read-time dedup 이 불필요하다. 재생 가능한
    // Drive 기록만 최신순 20개(#129).
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
        ),
      )
      .orderBy(desc(playbackHistory.lastPlayedAt))
      .limit(20)

    return rows
  },
)
