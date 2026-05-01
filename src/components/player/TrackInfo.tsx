import { Music } from 'lucide-react'
import type { TrackMetadata } from '~/types'

interface TrackInfoProps {
  fileName: string
  metadata: TrackMetadata | null
}

export function TrackInfo({ fileName, metadata }: TrackInfoProps) {
  if (!fileName) return null

  const title = metadata?.title || fileName.replace(/\.mp3$/i, '')
  const artist = metadata?.artist

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
