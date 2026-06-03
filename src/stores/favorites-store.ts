import { create } from 'zustand'
import { toast } from 'sonner'
import {
  getFavorites,
  reorderFavorites,
  toggleFavorite,
} from '~/server/favorites'
import type { FavoriteItem } from '~/components/library/library-shared'

// 즐겨찾기 단일 소스 — 플레이어의 별(★) 토글과 라이브러리 즐겨찾기 목록이
// 같은 store 를 구독해 한쪽 변경이 즉시 양쪽에 반영된다(cross-tree). player·ui
// store 와 동일한 zustand 패턴.
interface FavoritesStore {
  items: FavoriteItem[]
  // null 아님(빈 배열로 시작)이되, 최초 fetch 완료 여부를 loaded 로 구분.
  loaded: boolean
  loading: boolean
  // mediaAssetId 별 토글 진행 중 여부 — 별 아이콘 중복 클릭 방지.
  pendingIds: Set<string>

  load: (opts?: { force?: boolean }) => Promise<void>
  isFavorite: (mediaAssetId: string | null) => boolean
  toggle: (mediaAssetId: string) => Promise<void>
  // 드래그 종료 시 새 순서(favorite.id 배열)로 커밋. 낙관적 갱신 후 서버 반영.
  reorder: (orderedIds: string[]) => Promise<void>
  reset: () => void
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  items: [],
  loaded: false,
  loading: false,
  pendingIds: new Set<string>(),

  load: async (opts) => {
    const { loaded, loading } = get()
    if (loading) return
    if (loaded && !opts?.force) return
    set({ loading: true })
    try {
      const rows = await getFavorites()
      set({ items: rows, loaded: true })
    } catch {
      // 조용히 실패 — 별/목록은 빈 상태로 둔다. 토글 시 다시 시도된다.
    } finally {
      set({ loading: false })
    }
  },

  isFavorite: (mediaAssetId) =>
    mediaAssetId != null &&
    get().items.some((i) => i.mediaAssetId === mediaAssetId),

  toggle: async (mediaAssetId) => {
    const { pendingIds } = get()
    if (pendingIds.has(mediaAssetId)) return
    set({ pendingIds: new Set(pendingIds).add(mediaAssetId) })

    const wasFavorite = get().items.some((i) => i.mediaAssetId === mediaAssetId)
    const prev = get().items

    // 제거는 낙관적으로 즉시 반영(되돌릴 정보가 충분). 추가는 서버가 돌려준
    // 전체 item(blobUrl/lrcUrl 포함)이 필요하므로 응답 후 반영한다.
    if (wasFavorite) {
      set({ items: prev.filter((i) => i.mediaAssetId !== mediaAssetId) })
    }

    try {
      const res = await toggleFavorite({ data: { mediaAssetId } })
      if (res.favorited && res.item) {
        set((s) => ({ items: [...s.items, res.item] }))
      }
      // 제거 케이스는 이미 낙관적으로 반영됨.
    } catch {
      // 실패 시 롤백.
      if (wasFavorite) set({ items: prev })
      toast.error('즐겨찾기 변경에 실패했습니다')
    } finally {
      set((s) => {
        const next = new Set(s.pendingIds)
        next.delete(mediaAssetId)
        return { pendingIds: next }
      })
    }
  },

  reorder: async (orderedIds) => {
    const prev = get().items
    // 낙관적 재배치 — orderedIds 순으로 items 를 재정렬하고 position 도 갱신.
    const byId = new Map(prev.map((i) => [i.id, i]))
    const next = orderedIds
      .map((id, idx) => {
        const it = byId.get(id)
        return it ? { ...it, position: idx } : null
      })
      .filter((x): x is FavoriteItem => x !== null)
    set({ items: next })
    try {
      await reorderFavorites({ data: { orderedIds } })
    } catch {
      set({ items: prev })
      toast.error('순서 변경에 실패했습니다')
    }
  },

  reset: () =>
    set({ items: [], loaded: false, loading: false, pendingIds: new Set<string>() }),
}))
