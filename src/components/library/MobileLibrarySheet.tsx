import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { usePlayerStore } from '~/stores/player-store'
import { useUiStore } from '~/stores/ui-store'
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

export function MobileLibrarySheet({ userId: _userId, onPlay }: Props) {
  const isOpen = useUiStore((s) => s.isMobileLibraryOpen)
  const close = useUiStore((s) => s.closeMobileLibrary)
  const playingFileName = usePlayerStore((s) => s.fileName)
  const [tab, setTab] = useState<LibraryTab>('drive')

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
  } = useRecentPlaybacks({
    active: isOpen && tab === 'recent',
    onResolved: (payload) => {
      onPlay(payload)
      close()
    },
  })

  useEffect(() => {
    if (isOpen && tab === 'favorites') void loadFavorites()
  }, [isOpen, tab, loadFavorites])

  useEffect(() => {
    if (!isOpen) return
    const isMobile = window.matchMedia('(max-width: 1023.98px)').matches
    if (!isMobile) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, close])

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
    close()
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="내 미디어 닫기"
        onClick={close}
        className="absolute inset-0 bg-black/60"
      />
      <section className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] min-h-[60dvh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-2xl">
        <div className="border-b border-border px-4 pb-2 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-extrabold tracking-[-0.02em] text-foreground">
              내 미디어
            </h2>
            <button
              type="button"
              aria-label="닫기"
              onClick={close}
              className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          <LibraryTabs active={tab} onChange={setTab} />
        </div>

        <div className="min-h-0 flex-1">
          {tab === 'drive' && (
            <GoogleDriveBrowser
              onPlay={(payload) => {
                onPlay(payload)
                close()
              }}
            />
          )}
          {tab === 'recent' && (
            <div className="h-full overflow-y-auto px-4 py-2">
              <RecentPlaybackList
                rows={recent}
                error={recentError}
                resolvingId={resolvingId}
                playingFileName={playingFileName}
                onPlay={playRecent}
              />
            </div>
          )}
          {tab === 'favorites' && (
            <div className="h-full overflow-y-auto px-4 py-2">
              <FavoritesList
                items={favItems}
                loaded={favLoaded}
                playingFileName={playingFileName}
                onPlay={playFavorite}
                onRemove={removeFavoriteByFileId}
                onReorder={reorderFavorites}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
