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

const isResolveInput = (v: unknown): v is { fileName: string } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.fileName === 'string' && o.fileName.length > 0
}

// 파일명에서 확장자 제거 — sibling LRC 조회 시 stem 비교용. 서버 측은 client
// helper(library-shared)에 의존하지 않도록 인라인.
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

// 최근 재생 행에서 파일명을 받아 현재 라이브러리의 자산으로 해석해 재생 정보를
// 반환한다. playback_history 는 mediaAssetId 를 들고 있지 않으므로, 동일 유저의
// mediaAsset 중 같은 이름의 가장 최근 행을 매핑한다 — 라이브러리 UI 의 재생
// 흐름과 동일한 { url, name, mediaType, lrcUrl? } 페이로드를 만든다.
// 매칭 실패 시 Response 404 — UI 가 토스트로 안내하고 이력은 유지한다.
export const resolveRecentPlayback = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!isResolveInput(data)) throw new Error('Invalid resolve payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { mediaAsset } = await import('./db/schema')
    const { and, desc, eq, inArray, isNull } = await import('drizzle-orm')

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
          eq(mediaAsset.userId, user.id),
          eq(mediaAsset.name, data.fileName),
          inArray(mediaAsset.mediaType, ['audio', 'video']),
        ),
      )
      .orderBy(desc(mediaAsset.createdAt))
      .limit(1)

    if (!asset) {
      throw new Response('Asset not found', { status: 404 })
    }

    // sibling LRC — 라이브러리 UI 와 동일하게 같은 폴더 내 동일 stem 의 lyrics
    // 자산을 짝지어 LRC 가사를 함께 로드시킨다. folderId null(root) 도 동일 처리.
    const stem = basenameNoExt(asset.name)
    const folderClause =
      asset.folderId === null
        ? isNull(mediaAsset.folderId)
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
      url: asset.blobUrl,
      name: asset.name,
      mediaType: asset.mediaType === 'video' ? ('video' as const) : ('audio' as const),
      lrcUrl: sibling?.blobUrl,
      mediaAssetId: asset.id,
    }
  })

export const getRecentPlaybacks = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { playbackHistory } = await import('./db/schema')
    const { desc, eq } = await import('drizzle-orm')

    // 같은 파일을 여러 번 재생/로드해도 최근 기록 하나만 보여준다 (#90).
    // Postgres DISTINCT ON 으로 fileName 별로 lastPlayedAt 가장 큰 행을 뽑고,
    // ORDER BY 의 leftmost 컬럼은 fileName 이어야 한다는 제약 때문에 정렬은
    // 알파벳순으로 나온다. UI 노출 순서(최근순) 는 JS 측에서 재정렬한 뒤 상위
    // 20개로 자른다 — 사용자의 총 unique 파일 수가 보통 수십~수백 수준이라
    // 별도 LIMIT subquery 없이도 비용이 크지 않다.
    const rows = await db
      .selectDistinctOn([playbackHistory.fileName], {
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
      .orderBy(playbackHistory.fileName, desc(playbackHistory.lastPlayedAt))

    return rows
      .sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime())
      .slice(0, 20)
  },
)
