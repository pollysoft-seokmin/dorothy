import { Music } from 'lucide-react'
import type { MediaType, TrackMetadata } from '~/types'

interface TrackInfoProps {
  fileName: string
  mediaType: MediaType
  metadata: TrackMetadata | null
}

export function TrackInfo({ fileName, mediaType, metadata }: TrackInfoProps) {
  if (!fileName) return null

  const stripped = fileName.replace(/\.(mp3|mp4|webm|mov)$/i, '')
  const title = metadata?.title || stripped
  const artist = metadata?.artist

  // 비디오는 비디오 프레임이 시각적 정체성을 대체하므로 파일명만 한 줄로 표시
  if (mediaType === 'video') {
    return (
      <p className="text-sm font-medium truncate text-center px-1">
        {stripped}
      </p>
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
    </div>
  )
}
