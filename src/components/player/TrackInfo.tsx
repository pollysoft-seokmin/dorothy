import { Music, Star } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { MediaType, TrackMetadata } from '~/types'

interface TrackInfoProps {
  fileName: string
  mediaType: MediaType
  metadata: TrackMetadata | null
  // 즐겨찾기 — 라이브러리 자산일 때만 별을 노출한다(로컬 파일·비로그인은 false).
  favoritable?: boolean
  isFavorite?: boolean
  favoritePending?: boolean
  onToggleFavorite?: () => void
}

function FavoriteStar({
  isFavorite,
  pending,
  onToggle,
}: {
  isFavorite: boolean
  pending: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full transition-colors cursor-pointer disabled:opacity-50',
        isFavorite
          ? 'text-primary-bright hover:bg-foreground/10'
          : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
      )}
    >
      <Star className={cn('size-[18px]', isFavorite && 'fill-current')} />
    </button>
  )
}

export function TrackInfo({
  fileName,
  mediaType,
  metadata,
  favoritable = false,
  isFavorite = false,
  favoritePending = false,
  onToggleFavorite,
}: TrackInfoProps) {
  if (!fileName) return null

  const stripped = fileName.replace(/\.(mp3|mp4|webm|mov|mpg|mpeg)$/i, '')
  const title = metadata?.title || stripped
  const artist = metadata?.artist

  const star =
    favoritable && onToggleFavorite ? (
      <FavoriteStar
        isFavorite={isFavorite}
        pending={favoritePending}
        onToggle={onToggleFavorite}
      />
    ) : null

  // 비디오는 비디오 프레임이 시각적 정체성을 대체하므로 파일명만 한 줄로 표시
  if (mediaType === 'video') {
    return (
      <div className="flex items-center justify-center gap-2 px-1">
        <p className="text-sm font-medium truncate text-center">{stripped}</p>
        {star}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-1">
      {/* 앨범 아트 썸네일 */}
      <div className="h-12 w-12 shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {metadata?.albumArt ? (
          <img
            src={metadata.albumArt}
            alt="Album art"
            className="h-full w-full object-cover"
          />
        ) : (
          <Music className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* 제목 / 아티스트 */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        {artist && (
          <p className="text-xs text-muted-foreground truncate">{artist}</p>
        )}
      </div>

      {star}
    </div>
  )
}
