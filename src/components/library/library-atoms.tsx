// 모바일 Bottom Sheet 와 데스크톱 사이드바가 공유하는 라이브러리 UI atoms.
// 디자인 명세(library-sheet.jsx v2 + library-desktop.jsx)를 한 곳에서 관리해
// 한쪽 수정이 다른 쪽으로 자연스럽게 따라가도록 한다. density prop으로 모바일
// (comfortable)/데스크톱(compact) 두 톤만 제공 — 더 세분화는 회의 후 결정.

import { useEffect, useRef, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronRight,
  FileText,
  Film,
  Folder,
  FolderPlus,
  FolderUp,
  GripVertical,
  MoreHorizontal,
  Music,
  Star,
  Upload,
  UploadCloud,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { NowPlayingBars } from '~/components/library/NowPlayingBars'
import {
  formatBytes,
  formatRelativeTime,
  isUploadActive,
  phaseLabel,
  type AssetItem,
  type FavoriteItem,
  type LibraryMediaType,
  type PendingItem,
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

// StorageGauge 의 segment 색 — TYPE_COLOR 의 hex 표현. CSS background-color 로 직접
// 쓰기 위해 별도 분리.
const TYPE_BG_COLOR: Record<'audio' | 'video' | 'lyrics', string> = {
  audio: '#1ED760',
  video: '#A28DFF',
  lyrics: '#FFB75D',
}

const TYPE_ICON: Record<LibraryMediaType | 'folder', typeof Music> = {
  audio: Music,
  video: Film,
  lyrics: FileText,
  folder: Folder,
}

// ─────────────────────────────────────────────────────────
// StorageGauge — 6px 세그먼트 가로 바 + 라벨 + 6px 도트 범례
// ─────────────────────────────────────────────────────────

interface StorageGaugeProps {
  used: number
  quota: number
  byType?: { audio: number; video: number; lyrics: number }
}

export function StorageGauge({ used, quota, byType }: StorageGaugeProps) {
  const safeQuota = quota > 0 ? quota : 1
  const usedPct = Math.min(1, used / safeQuota)
  const pctLabel = Math.round(usedPct * 100)

  // byType 제공 시 음악/영상/가사를 quota 대비 비율로 분할 — 모든 비율의 합은
  // usedPct 이하(반올림 오차 무시). byType 미제공 시 단일 그린 세그먼트.
  const segments: { key: string; ratio: number; color: string; label: string }[] =
    byType
      ? [
          { key: 'audio', ratio: byType.audio / safeQuota, color: TYPE_BG_COLOR.audio, label: '음악' },
          { key: 'video', ratio: byType.video / safeQuota, color: TYPE_BG_COLOR.video, label: '영상' },
          { key: 'lyrics', ratio: byType.lyrics / safeQuota, color: TYPE_BG_COLOR.lyrics, label: '가사' },
        ]
      : [
          { key: 'used', ratio: usedPct, color: TYPE_BG_COLOR.audio, label: '사용 중' },
        ]

  return (
    <div className="w-full">
      {/* numbers row */}
      <div className="mb-1.5 flex items-baseline justify-between">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-dim">
          스토리지
        </div>
        <div className="font-mono text-[11px] font-semibold">
          <span className="text-foreground">{formatBytes(used)}</span>
          <span className="text-text-dim"> / {formatBytes(quota)}</span>
          <span className="ml-2 text-muted-foreground">{pctLabel}%</span>
        </div>
      </div>

      {/* gauge bar */}
      <div className="relative flex h-1.5 overflow-hidden rounded-full bg-accent">
        {segments.map((seg, i) => (
          <div
            key={seg.key}
            className={i < segments.length - 1 ? 'border-r border-black/35' : ''}
            style={{
              width: `${seg.ratio * 100}%`,
              height: '100%',
              background: seg.color,
            }}
          />
        ))}
      </div>

      {/* legend (only when breakdown is available) */}
      {byType && (
        <div className="mt-1.5 flex gap-3.5">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full"
                style={{ background: seg.color }}
              />
              <span className="text-[10px] font-semibold text-muted-foreground">
                {seg.label}{' '}
                <span className="font-mono text-text-dim">
                  {Math.round(seg.ratio * 100)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// LibraryTabs — 최근 / 폴더 / 즐겨찾기 탭바 (밑줄 인디케이터)
// ─────────────────────────────────────────────────────────

export type LibraryTab = 'recent' | 'folders' | 'favorites'

const TAB_DEFS: { key: LibraryTab; label: string }[] = [
  { key: 'recent', label: '최근' },
  { key: 'folders', label: '폴더' },
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
              <div className="grid size-10 shrink-0 place-items-center rounded bg-accent">
                <Icon
                  className={cn(
                    'size-[18px]',
                    isLoaded ? 'text-primary-bright' : 'text-muted-foreground',
                  )}
                />
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
  onRemove: (mediaAssetId: string) => void
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
              onClick={() => onRemove(item.mediaAssetId)}
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
}

export function TypeTile({ kind, playing, density = 'comfortable' }: TypeTileProps) {
  const Icon = TYPE_ICON[kind]
  const color = playing ? 'text-primary-bright' : TYPE_COLOR[kind]
  const sizeClass = density === 'compact' ? 'size-9 rounded-md' : 'size-11 rounded-lg'
  const iconSizeClass = density === 'compact' ? 'size-[17px]' : 'size-5'
  const barsSize = density === 'compact' ? 14 : 18
  return (
    <div className={cn(sizeClass, 'grid shrink-0 place-items-center bg-secondary', color)}>
      {playing ? (
        <NowPlayingBars playing size={barsSize} />
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
}

export function AssetRow({
  asset,
  active,
  playing,
  onClick,
  actions,
  density = 'comfortable',
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
        <TypeTile kind={kind} playing={playing} density={density} />
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

interface PendingRowProps extends RowDensityProps {
  row: PendingItem
  onDismiss?: () => void
}

export function PendingRow({ row, onDismiss, density = 'comfortable' }: PendingRowProps) {
  const isError = row.phase === 'error'
  const rowCls =
    density === 'compact'
      ? 'gap-3 rounded-md px-2 py-2'
      : 'gap-3.5 rounded px-1 py-2.5'
  const nameCls = density === 'compact' ? 'text-[13px]' : 'text-[15px]'
  const phaseCls = density === 'compact' ? 'text-[11px]' : 'text-xs'
  const trackHeight = density === 'compact' ? 'h-[2.5px]' : 'h-[3px]'
  return (
    <div className={cn('flex items-center', rowCls)}>
      <TypeTile kind={row.mediaType} density={density} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            nameCls,
            'truncate font-bold tracking-[-0.01em] text-muted-foreground',
          )}
        >
          {row.name}
        </div>
        <div
          className={cn(
            phaseCls,
            'mt-1 flex items-center gap-1.5 font-semibold',
            isError ? 'text-destructive' : 'text-primary-bright',
          )}
        >
          <span>{phaseLabel(row.phase)}</span>
          {!isError && row.phase !== 'preparing' && (
            <span className="font-mono">{Math.round(row.progress)}%</span>
          )}
          {isError && row.errorMessage && (
            <span className="truncate text-text-dim">· {row.errorMessage}</span>
          )}
        </div>
        {!isError && (
          <div
            className={cn(
              trackHeight,
              'mt-1.5 overflow-hidden rounded-full bg-white/[0.08]',
            )}
          >
            <div
              className="h-full rounded-full bg-primary-bright transition-[width] duration-200"
              style={{ width: `${row.progress}%` }}
            />
          </div>
        )}
      </div>
      {isError && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-text-dim hover:text-foreground cursor-pointer"
        >
          닫기
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// UploadSummaryCell — 업로드 진행을 단일 셀로 요약. 활성 항목이 있을 때만 렌더.
// 전체 배치 진행률(완료/실패=1, 현재 파일=progress/전체) 게이지 + 현재 파일 + 실패 요약.
// items 는 활성+done(+error) 전부 — 전체/진행률 계산용.
// ─────────────────────────────────────────────────────────

interface UploadSummaryCellProps extends RowDensityProps {
  items: PendingItem[]
}

export function UploadSummaryCell({ items, density = 'comfortable' }: UploadSummaryCellProps) {
  const total = items.length
  if (total === 0) return null
  const errorCount = items.filter((p) => p.phase === 'error').length
  const processed = items.filter((p) => p.phase === 'done' || p.phase === 'error').length
  const active = items.find(isUploadActive)
  const fraction =
    items.reduce(
      (s, p) => s + (p.phase === 'done' || p.phase === 'error' ? 1 : p.progress / 100),
      0,
    ) / total
  const pct = Math.round(fraction * 100)

  const pad = density === 'compact' ? 'px-2.5 py-2.5' : 'px-3 py-3'
  const trackHeight = density === 'compact' ? 'h-[3px]' : 'h-[4px]'

  return (
    <div className={cn('rounded-lg border border-border bg-secondary/60', pad)}>
      <div className="flex items-center gap-2">
        <UploadCloud className="size-4 shrink-0 text-primary-bright" />
        <span className="text-[12px] font-extrabold tracking-[-0.01em] text-foreground">
          업로드 중
        </span>
        <span className="font-mono text-[11px] text-text-dim">
          {processed}/{total}
        </span>
        <span className="ml-auto font-mono text-[12px] font-bold text-primary-bright">
          {pct}%
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold">
        {active ? (
          <>
            <span
              className="min-w-0 truncate text-muted-foreground"
              title={active.name}
            >
              {active.name}
            </span>
            <span className="shrink-0 text-text-dim">· {phaseLabel(active.phase)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">마무리 중…</span>
        )}
        {errorCount > 0 && (
          <span className="ml-auto shrink-0 font-bold text-destructive">
            {errorCount}개 실패
          </span>
        )}
      </div>
      <div className={cn(trackHeight, 'mt-2 overflow-hidden rounded-full bg-white/[0.08]')}>
        <div
          className="h-full rounded-full bg-primary-bright transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// LibraryActionsMenu — 브레드크럼 우측 "..." 메뉴 (폴더 추가 / 파일 업로드)
// ─────────────────────────────────────────────────────────

export function LibraryActionsMenu({
  onCreateFolder,
  onUpload,
  onUploadFolder,
}: {
  onCreateFolder: () => void
  onUpload: () => void
  // 데스크톱 전용 — 폴더 구조 업로드. 미전달 시 메뉴 항목을 숨긴다(모바일).
  onUploadFolder?: () => void
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="폴더 작업 메뉴"
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground data-[state=open]:bg-white/10"
        >
          <MoreHorizontal className="size-[18px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[70] min-w-[10rem] rounded-md border bg-popover py-1 shadow-md"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent"
            onSelect={onCreateFolder}
          >
            <FolderPlus className="size-4" />
            폴더 추가
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent"
            onSelect={onUpload}
          >
            <Upload className="size-4" />
            파일 업로드
          </DropdownMenu.Item>
          {onUploadFolder && (
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent"
              onSelect={onUploadFolder}
            >
              <FolderUp className="size-4" />
              폴더 업로드
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ─────────────────────────────────────────────────────────
// CreateFolderDialog — 폴더명 입력 팝업(모달). 오버레이 + 중앙 카드.
// ─────────────────────────────────────────────────────────

export function CreateFolderDialog({
  open,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState('')

  // 열릴 때마다 입력값 초기화.
  useEffect(() => {
    if (open) setName('')
  }, [open])

  if (!open) return null

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="새 폴더 만들기"
        className="relative w-full max-w-xs rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <h2 className="text-base font-extrabold tracking-[-0.02em] text-foreground">
          새 폴더
        </h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onClose()
          }}
          placeholder="폴더 이름"
          className="mt-3.5 h-11 w-full rounded-full border border-border bg-accent px-4 text-sm font-semibold text-foreground placeholder:text-text-dim focus:border-primary-bright focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !name.trim()}
            className="cursor-pointer rounded-full bg-primary-bright px-5 py-2 text-sm font-extrabold text-background hover:bg-primary disabled:opacity-50"
          >
            만들기
          </button>
        </div>
      </div>
    </div>
  )
}
