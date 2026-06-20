import { useEffect, useState } from 'react'
import { usePlayerStore } from '~/stores/player-store'
import { useFavoritesStore } from '~/stores/favorites-store'
import { useRecentPlaybacks } from '~/hooks/useRecentPlaybacks'
import { GoogleDriveBrowser } from '~/components/library/GoogleDriveBrowser'
import {
  FavoritesList,
  LibraryTabs,
  RecentPlaybackList,
  type LibraryTab,
} from '~/components/library/library-atoms'
import type { FavoriteItem } from '~/components/library/library-shared'
import type { DrivePlayParams } from '~/lib/google-drive'

type Props = {
  userId: string
  onPlay: (params: DrivePlayParams) => void
}

export function MediaLibrary({ userId: _userId, onPlay }: Props) {
  const [tab, setTab] = useState<LibraryTab>('drive')
  const playingFileName = usePlayerStore((s) => s.fileName)

  const favItems = useFavoritesStore((s) => s.items)
  const favLoaded = useFavoritesStore((s) => s.loaded)
  const loadFavorites = useFavoritesStore((s) => s.load)
  const removeFavorite = useFavoritesStore((s) => s.toggle)
  const reorderFavorites = useFavoritesStore((s) => s.reorder)

  const {
    recent,
    error: recentError,
    resolvingId,
    playRecent,
  } = useRecentPlaybacks({ active: tab === 'recent', onResolved: onPlay })

  useEffect(() => {
    if (tab === 'favorites') void loadFavorites()
  }, [tab, loadFavorites])

  const playFavorite = (item: FavoriteItem) => {
    onPlay({
      url: item.url,
      name: item.name,
      mediaType: item.mediaType,
      lrcUrl: item.lrcUrl,
      source: 'google_drive',
      providerFileId: item.fileId,
      providerLrcFileId: item.lrcFileId,
      mimeType: item.mimeType,
    })
  }

  const removeFavoriteByFileId = (fileId: string) => {
    const item = favItems.find((fav) => fav.fileId === fileId)
    if (!item) return
    void removeFavorite({
      fileId: item.fileId,
      name: item.name,
      mediaType: item.mediaType,
      mimeType: item.mimeType,
      lrcFileId: item.lrcFileId,
    })
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-card">
      <div className="border-b border-border px-5 pb-2.5 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold tracking-[-0.02em] text-foreground">
            내 미디어
          </h2>
        </div>
        <LibraryTabs active={tab} onChange={setTab} density="compact" />
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'drive' && <GoogleDriveBrowser onPlay={onPlay} density="compact" />}
        {tab === 'recent' && (
          <div className="h-full overflow-y-auto px-3 py-2">
            <RecentPlaybackList
              rows={recent}
              error={recentError}
              resolvingId={resolvingId}
              playingFileName={playingFileName}
              onPlay={playRecent}
              density="compact"
            />
          </div>
        )}
        {tab === 'favorites' && (
          <div className="h-full overflow-y-auto px-3 py-2">
            <FavoritesList
              items={favItems}
              loaded={favLoaded}
              playingFileName={playingFileName}
              onPlay={playFavorite}
              onRemove={removeFavoriteByFileId}
              onReorder={reorderFavorites}
              density="compact"
            />
          </div>
        )}
      </div>
    </section>
  )
}
