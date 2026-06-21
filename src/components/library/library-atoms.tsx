// 모바일 Bottom Sheet 와 데스크톱 사이드바가 공유하는 라이브러리 UI atoms.
// 디자인 명세(library-sheet.jsx v2 + library-desktop.jsx)를 한 곳에서 관리해
// 한쪽 수정이 다른 쪽으로 자연스럽게 따라가도록 한다. density prop으로 모바일
// (comfortable)/데스크톱(compact) 두 톤만 제공 — 더 세분화는 회의 후 결정.

import { useRef, useState } from 'react'
import {
  ChevronRight,
  FileText,
  Film,
  Folder,
  GripVertical,
  Music,
  Star,
  Upload,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { useVideoThumbnails } from '~/hooks/useVideoThumbnails'
import { NowPlayingBars } from '~/components/library/NowPlayingBars'
import {
  formatRelativeTime,
  type AssetItem,
  type FavoriteItem,
  type LibraryMediaType,
  type RecentPlayback,
} from '~/components/library/library-shared'

type Density = 'comfortable' | 'compact'

// 디자인 명세 — 음악 그린, 영상 보라, 가사 앰버, 폴더 흰색.
const TYPE_COLOR: Record<LibraryMediaType | 'folder', string> = {
  audio: 'text-primary-bright',
  video: 'text-[#A28DFF]',
  lyrics: 'text-[#FFB75D]',
  folder: 'text-foreground',
}

const TYPE_ICON: Record<LibraryMediaType | 'folder', typeof Music> = {
  audio: Music,
  video: Film,
  lyrics: FileText,
  folder: Folder,
}

// ─────────────────────────────────────────────────────────
// LibraryTabs — 최근 / 폴더 / 즐겨찾기 탭바 (밑줄 인디케이터)
// ─────────────────────────────────────────────────────────

export type LibraryTab = 'drive' | 'recent' | 'favorites'

// 'Google Drive' 는 Google 정식 제품명 — 브랜드 가이드라인상 번역하지 않는다
// (로케일 무관). '최근'/'즐겨찾기' 만 한국어.
const TAB_DEFS: { key: LibraryTab; label: string }[] = [
  { key: 'drive', label: 'Google Drive' },
  { key: 'recent', label: '최근' },
  { key: 'favorites', label: '즐겨찾기' },
]

interface LibraryTabsProps {
  active: LibraryTab
  onChange: (tab: LibraryTab) => void
  density?: Density
}

export function LibraryTabs({ active, onChange, density = 'comfortable' }: LibraryTabsProps) {
  const textCls = density === 'compact' ? 'text-[13px]' : 'text-sm'
  const padCls = density === 'compact' ? 'px-2.5 pb-2 pt-0.5' : 'px-3 pb-2.5 pt-1'
  return (
    <div className="flex items-center gap-1">
      {TAB_DEFS.map((t) => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-pressed={isActive}
            className={cn(
              'relative cursor-pointer font-bold tracking-[-0.01em] transition-colors',
              textCls,
              padCls,
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary-bright" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// RecentPlaybackList — 최근 재생 목록 (아이콘 + 제목/아티스트 + 상대시간)
// ─────────────────────────────────────────────────────────

const VIDEO_EXT_RE = /\.(mp4|webm|mov|mpg|mpeg|m4v|avi|mkv)$/i

interface RecentPlaybackListProps {
  rows: RecentPlayback[] | null
  error: string | null
  resolvingId: string | null
  playingFileName: string | null
  onPlay: (row: RecentPlayback) => void
  density?: Density
}

export function RecentPlaybackList({
  rows,
  error,
  resolvingId,
  playingFileName,
  onPlay,
  density = 'comfortable',
}: RecentPlaybackListProps) {
  // 비디오 행의 캐시된 썸네일(providerFileId 키). 훅 규칙상 early-return 이전에 호출.
  const thumbs = useVideoThumbnails(
    (rows ?? []).map((r) => ({
      id: r.providerFileId,
      isVideo: r.mediaType === 'video' || VIDEO_EXT_RE.test(r.fileName),
    })),
  )

  if (error)
    return (
      <p className="py-6 text-center text-sm text-destructive">
        불러오기 실패: {error}
      </p>
    )
  if (rows === null)
    return (
      <p className="py-6 text-center text-sm text-text-dim">불러오는 중…</p>
    )
  if (rows.length === 0)
    return (
      <p className="py-6 text-center text-sm text-text-dim">
        아직 재생 이력이 없습니다.
      </p>
    )

  const rowCls = density === 'compact' ? 'gap-3 px-2 py-2' : 'gap-3 py-2.5'
  return (
    <ul>
      {rows.map((row) => {
        // 강조 정책: 현재 player 에 로딩된 파일과 fileName 이 같으면 초록.
        const isLoaded = row.fileName === playingFileName
        const Icon = VIDEO_EXT_RE.test(row.fileName) ? Film : Music
        const isResolving = resolvingId === row.id
        const thumb = row.providerFileId ? thumbs[row.providerFileId] : undefined
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onPlay(row)}
              disabled={isResolving}
              className={cn(
                'flex w-full items-center rounded-md text-left hover:bg-white/5 disabled:opacity-60 cursor-pointer',
                rowCls,
              )}
            >
              <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded bg-accent">
                {thumb ? (
                  <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <Icon
                    className={cn(
                      'size-[18px]',
                      isLoaded ? 'text-primary-bright' : 'text-muted-foreground',
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'truncate text-sm font-bold tracking-[-0.01em]',
                    isLoaded ? 'text-primary-bright' : 'text-foreground',
                  )}
                  title={row.title ?? row.fileName}
                >
                  {row.title ?? row.fileName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {row.artist ?? '—'}
                  {' · '}
                  <span className="text-text-dim">
                    {formatRelativeTime(row.lastPlayedAt)}
                  </span>
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────
// FavoritesEmpty — 즐겨찾기 빈 상태 안내
// ─────────────────────────────────────────────────────────

export function FavoritesEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-secondary text-text-dim">
        <Star className="size-6" />
      </div>
      <div className="mt-3 text-sm font-bold text-foreground">
        즐겨찾기가 비어 있습니다
      </div>
      <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
        재생 중인 미디어의 제목 옆 별(★)을 눌러 즐겨찾기에 추가하세요.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// FavoritesList — 즐겨찾기 목록. 그립 핸들 드래그(pointer 이벤트)로 순서 변경,
// 행 클릭 재생, 행 우측 ★ 로 해제. 데스크톱 마우스 + 모바일 터치 모두 지원.
// 외부 DnD 라이브러리 없이 live-reflow 방식 — 드래그 중 포인터가 행 중점을
// 넘으면 그 자리로 즉시 재배치하고, 포인터 업에서 새 순서를 커밋한다.
// ─────────────────────────────────────────────────────────

interface FavoritesListProps {
  items: FavoriteItem[]
  loaded: boolean
  playingFileName: string | null
  onPlay: (item: FavoriteItem) => void
  onRemove: (fileId: string) => void
  onReorder: (orderedIds: string[]) => void
  density?: Density
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0) return arr
  const next = [...arr]
  const [it] = next.splice(from, 1)
  next.splice(to, 0, it)
  return next
}

export function FavoritesList({
  items,
  loaded,
  playingFileName,
  onPlay,
  onRemove,
  onReorder,
  density = 'comfortable',
}: FavoritesListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  // 드래그 중에만 채워지는 로컬 순서. null 이면 props.items 를 그대로 렌더.
  const [dragOrder, setDragOrder] = useState<FavoriteItem[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  const order = dragOrder ?? items

  if (!loaded) {
    return <p className="py-6 text-center text-sm text-text-dim">불러오는 중…</p>
  }
  if (items.length === 0) {
    return <FavoritesEmpty />
  }

  const rowCls = density === 'compact' ? 'gap-2 rounded-md px-1.5 py-2' : 'gap-2.5 py-2.5'
  const nameCls = density === 'compact' ? 'text-[13px]' : 'text-[15px]'

  const indexFromPointer = (clientY: number): number => {
    const container = listRef.current
    if (!container) return 0
    const rows = Array.from(
      container.querySelectorAll<HTMLElement>('[data-fav-row]'),
    )
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect()
      if (clientY < r.top + r.height / 2) return i
    }
    return rows.length - 1
  }

  const onHandlePointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    pointerIdRef.current = e.pointerId
    setDraggingId(id)
    setDragOrder([...order])
  }

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (draggingId === null || e.pointerId !== pointerIdRef.current) return
    setDragOrder((cur) => {
      const base = cur ?? items
      const from = base.findIndex((x) => x.id === draggingId)
      const to = indexFromPointer(e.clientY)
      return from === -1 ? base : moveItem(base, from, to)
    })
  }

  const finishDrag = (e: React.PointerEvent) => {
    if (draggingId === null) return
    const finalOrder = dragOrder ?? items
    const changed = finalOrder.some((it, i) => it.id !== items[i]?.id)
    if (changed) onReorder(finalOrder.map((it) => it.id))
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch {
      // already released
    }
    pointerIdRef.current = null
    setDraggingId(null)
    setDragOrder(null)
  }

  return (
    <ul ref={listRef} className="select-none">
      {order.map((item) => {
        const isPlaying = item.name === playingFileName
        const isDragging = item.id === draggingId
        const Icon = item.mediaType === 'video' ? Film : Music
        return (
          <li
            key={item.id}
            data-fav-row
            className={cn(
              'group flex items-center',
              rowCls,
              isDragging
                ? 'bg-white/[0.06] ring-1 ring-primary/40'
                : isPlaying
                  ? 'bg-primary/10'
                  : 'hover:bg-white/[0.04]',
            )}
          >
            <button
              type="button"
              aria-label="드래그하여 순서 변경"
              onPointerDown={(e) => onHandlePointerDown(e, item.id)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              style={{ touchAction: 'none' }}
              className="grid size-7 shrink-0 cursor-grab touch-none place-items-center text-text-dim hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="size-[16px]" />
            </button>

            <button
              type="button"
              onClick={() => onPlay(item)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
            >
              <div
                className={cn(
                  density === 'compact' ? 'size-9 rounded-md' : 'size-11 rounded-lg',
                  'grid shrink-0 place-items-center bg-secondary',
                  isPlaying ? 'text-primary-bright' : item.mediaType === 'video' ? 'text-[#A28DFF]' : 'text-primary-bright',
                )}
              >
                {isPlaying ? (
                  <NowPlayingBars playing size={density === 'compact' ? 14 : 18} />
                ) : (
                  <Icon className={density === 'compact' ? 'size-[17px]' : 'size-5'} />
                )}
              </div>
              <span
                className={cn(
                  nameCls,
                  'block min-w-0 flex-1 truncate font-bold tracking-[-0.01em]',
                  isPlaying ? 'text-primary-bright' : 'text-foreground',
                )}
                title={item.name}
              >
                {item.name}
              </span>
            </button>

            <button
              type="button"
              aria-label="즐겨찾기 해제"
              onClick={() => onRemove(item.fileId)}
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-primary-bright hover:bg-white/10"
            >
              <Star className="size-[16px] fill-current" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────
// LibraryEmptyDropZone — 빈 폴더(데스크톱) 드롭/클릭 업로드 안내 영역
// ─────────────────────────────────────────────────────────

interface LibraryEmptyDropZoneProps {
  onPickFiles: () => void
  // 드래그&드롭을 직접 받는 경우(비로그인 플레이어)만 전달. 라이브러리는 부모
  // pane 이 드롭을 처리하므로 생략한다.
  dragging?: boolean
  onDragOver?: React.DragEventHandler<HTMLButtonElement>
  onDragEnter?: React.DragEventHandler<HTMLButtonElement>
  onDragLeave?: React.DragEventHandler<HTMLButtonElement>
  onDrop?: React.DragEventHandler<HTMLButtonElement>
}

export function LibraryEmptyDropZone({
  onPickFiles,
  dragging = false,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: LibraryEmptyDropZoneProps) {
  return (
    <div className="flex h-full min-h-[260px] flex-col p-4">
      <button
        type="button"
        onClick={onPickFiles}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'flex flex-1 cursor-pointer flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed px-8 text-center transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-white/15 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.04]',
        )}
      >
        <div className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary-bright">
          <Upload className="size-7" />
        </div>
        <div>
          <div className="text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
            미디어 추가
          </div>
          <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">
            파일을 여기에 드롭하거나, 클릭하여 선택하세요.
          </p>
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          {['mp3', 'mp4', 'mpg'].map((ext) => (
            <span
              key={ext}
              className="rounded-full bg-secondary px-2 py-[3px] font-mono text-[10px] font-bold text-muted-foreground"
            >
              {ext}
            </span>
          ))}
        </div>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// TypeTile — 컬러 코드 + (재생 중) 막대 그래프
// ─────────────────────────────────────────────────────────

interface TypeTileProps {
  kind: LibraryMediaType | 'folder'
  playing?: boolean
  density?: Density
  // 비디오 썸네일 object URL. 있으면 아이콘 대신 이미지를 채운다.
  thumbnailUrl?: string
}

export function TypeTile({ kind, playing, density = 'comfortable', thumbnailUrl }: TypeTileProps) {
  const Icon = TYPE_ICON[kind]
  const color = playing ? 'text-primary-bright' : TYPE_COLOR[kind]
  const sizeClass = density === 'compact' ? 'size-9 rounded-md' : 'size-11 rounded-lg'
  const iconSizeClass = density === 'compact' ? 'size-[17px]' : 'size-5'
  const barsSize = density === 'compact' ? 14 : 18
  return (
    <div className={cn(sizeClass, 'relative grid shrink-0 place-items-center overflow-hidden bg-secondary', color)}>
      {playing ? (
        <NowPlayingBars playing size={barsSize} />
      ) : thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <Icon className={iconSizeClass} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// BreadcrumbChips — pill chips 수평 스크롤. 위/아래 16px 여백(py-4).
// ─────────────────────────────────────────────────────────

interface BreadcrumbChipsProps {
  crumbs: { id: string | null; name: string }[]
  onSelect: (id: string | null) => void
  density?: Density
}

export function BreadcrumbChips({ crumbs, onSelect, density = 'comfortable' }: BreadcrumbChipsProps) {
  const pillCls =
    density === 'compact'
      ? 'rounded-full px-2.5 py-1 text-[12px]'
      : 'rounded-full px-3 py-1.5 text-[13px]'
  const sep = density === 'compact' ? 'text-[12px]' : 'text-[13px]'
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-4 scrollbar-thin">
      {crumbs.map((crumb, i) => {
        const active = i === crumbs.length - 1
        return (
          <span key={crumb.id ?? 'root'} className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelect(crumb.id)}
              className={cn(
                pillCls,
                'inline-flex shrink-0 items-center gap-1.5 font-bold tracking-[-0.01em] cursor-pointer transition-colors',
                active
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {crumb.name}
            </button>
            {!active && (
              <span className={cn(sep, 'text-text-dim')} aria-hidden>
                /
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SectionLabel — 대문자 caps 라벨 + 우측 카운트
// ─────────────────────────────────────────────────────────

interface SectionLabelProps {
  children: React.ReactNode
  right?: React.ReactNode
  density?: Density
}

export function SectionLabel({ children, right, density = 'comfortable' }: SectionLabelProps) {
  const padCls = density === 'compact' ? 'pb-1 pt-3 px-2' : 'pb-1.5 pt-3.5'
  return (
    <div className={cn(padCls, 'flex items-center justify-between')}>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-dim">
        {children}
      </div>
      {right && <div className="text-[11px] text-text-dim">{right}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Row components — Folder / Asset / Pending
// ─────────────────────────────────────────────────────────

interface RowDensityProps {
  density?: Density
}

interface FolderRowProps extends RowDensityProps {
  name: string
  onClick: () => void
  actions?: React.ReactNode
}

export function FolderRow({ name, onClick, actions, density = 'comfortable' }: FolderRowProps) {
  const rowCls =
    density === 'compact'
      ? 'gap-3 rounded-md px-2 py-2'
      : 'gap-3.5 rounded px-1 py-2.5'
  const nameCls = density === 'compact' ? 'text-[13px]' : 'text-[15px]'
  return (
    <div className={cn('group flex items-center', rowCls, 'hover:bg-white/[0.04]')}>
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3.5 text-left cursor-pointer"
      >
        <TypeTile kind="folder" density={density} />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              nameCls,
              'block truncate font-bold tracking-[-0.01em] text-foreground',
            )}
          >
            {name}
          </span>
        </span>
        {!actions && (
          <ChevronRight className="size-[14px] shrink-0 text-text-dim" />
        )}
      </button>
      {actions}
    </div>
  )
}

interface AssetRowProps extends RowDensityProps {
  asset: AssetItem
  active: boolean
  playing: boolean
  onClick: () => void
  actions?: React.ReactNode
  // 비디오 썸네일 object URL (있을 때만). 없으면 미디어 타입 아이콘 폴백.
  thumbnailUrl?: string
}

export function AssetRow({
  asset,
  active,
  playing,
  onClick,
  actions,
  density = 'comfortable',
  thumbnailUrl,
}: AssetRowProps) {
  const kind = (asset.mediaType === 'lyrics'
    ? 'lyrics'
    : asset.mediaType === 'video'
      ? 'video'
      : 'audio') as LibraryMediaType
  const isLyrics = kind === 'lyrics'
  const rowCls =
    density === 'compact'
      ? 'gap-3 rounded-md px-2 py-2'
      : 'gap-3.5 rounded px-1 py-2.5'
  const nameCls = density === 'compact' ? 'text-[13px]' : 'text-[15px]'
  return (
    <div
      className={cn(
        'group flex items-center',
        rowCls,
        active ? 'bg-primary/10' : 'hover:bg-white/[0.04]',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={isLyrics}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-3.5 text-left',
          isLyrics ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        <TypeTile kind={kind} playing={playing} density={density} thumbnailUrl={thumbnailUrl} />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              nameCls,
              'block truncate font-bold tracking-[-0.01em]',
              active ? 'text-primary-bright' : 'text-foreground',
            )}
            title={asset.name}
          >
            {asset.name}
          </span>
        </span>
      </button>
      {actions}
    </div>
  )
}
