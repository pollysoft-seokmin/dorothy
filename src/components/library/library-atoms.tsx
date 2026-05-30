// 모바일 Bottom Sheet 와 데스크톱 사이드바가 공유하는 라이브러리 UI atoms.
// 디자인 명세(library-sheet.jsx v2 + library-desktop.jsx)를 한 곳에서 관리해
// 한쪽 수정이 다른 쪽으로 자연스럽게 따라가도록 한다. density prop으로 모바일
// (comfortable)/데스크톱(compact) 두 톤만 제공 — 더 세분화는 회의 후 결정.

import { ChevronRight, FileText, Film, Folder, Music, Star } from 'lucide-react'
import { cn } from '~/lib/utils'
import { NowPlayingBars } from '~/components/library/NowPlayingBars'
import {
  formatBytes,
  formatRelativeTime,
  phaseLabel,
  type AssetItem,
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

const TYPE_LABEL: Record<LibraryMediaType, string> = {
  audio: '오디오',
  video: '영상',
  lyrics: '가사',
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
// FavoritesEmpty — 즐겨찾기(추후 구현) 빈 상태 안내
// ─────────────────────────────────────────────────────────

export function FavoritesEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-secondary text-text-dim">
        <Star className="size-6" />
      </div>
      <div className="mt-3 text-sm font-bold text-foreground">
        즐겨찾기는 준비 중입니다
      </div>
      <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
        곧 자주 듣는 미디어를 즐겨찾기에 모아볼 수 있어요.
      </p>
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
  count?: number | null
  onClick: () => void
  actions?: React.ReactNode
}

export function FolderRow({ name, count, onClick, actions, density = 'comfortable' }: FolderRowProps) {
  const rowCls =
    density === 'compact'
      ? 'gap-3 rounded-md px-2 py-2'
      : 'gap-3.5 rounded px-1 py-2.5'
  const nameCls = density === 'compact' ? 'text-[13px]' : 'text-[15px]'
  const subCls = density === 'compact' ? 'text-[11px]' : 'text-xs'
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
          <span className={cn(subCls, 'mt-0.5 block text-text-dim')}>
            {count !== null && count !== undefined ? `${count}개 항목` : '폴더'}
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
  const subCls = density === 'compact' ? 'text-[11px]' : 'text-xs'
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
          <span
            className={cn(
              subCls,
              'mt-0.5 flex items-center gap-1.5 text-text-dim',
            )}
          >
            <span>{TYPE_LABEL[kind]}</span>
            <span>·</span>
            <span className="font-mono">{formatBytes(asset.sizeBytes)}</span>
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
// ActionBar — `+ 폴더` outline + `↑ 업로드` 그린. 폴더 생성 모드 모핑.
// ─────────────────────────────────────────────────────────

interface ActionBarProps {
  creating: boolean
  newName: string
  setNewName: (s: string) => void
  onStartCreate: () => void
  onCancelCreate: () => void
  onSubmitCreate: () => void
  onPickFiles: () => void
  submittingFolder: boolean
  density?: Density
  // sticky 영역의 외곽 패딩/safe-area 처리는 부모가 결정 — atom 은 buttons 만.
  className?: string
}

export function ActionBar({
  creating,
  newName,
  setNewName,
  onCancelCreate,
  onStartCreate,
  onSubmitCreate,
  onPickFiles,
  submittingFolder,
  density = 'comfortable',
  className,
}: ActionBarProps) {
  const btnH = density === 'compact' ? 'h-10' : 'h-12'
  const labelCls = density === 'compact' ? 'text-[13px]' : 'text-sm'

  if (creating) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmitCreate()
            if (e.key === 'Escape') onCancelCreate()
          }}
          placeholder="새 폴더 이름"
          className={cn(
            'flex-1 rounded-full border border-primary-bright bg-accent px-4 font-semibold text-foreground placeholder:text-text-dim focus:outline-none',
            density === 'compact' ? 'h-10 text-[13px]' : 'h-11 text-sm',
          )}
        />
        <button
          type="button"
          onClick={onSubmitCreate}
          disabled={submittingFolder || !newName.trim()}
          className={cn(
            'cursor-pointer rounded-full bg-primary-bright px-5 font-extrabold text-background disabled:opacity-50',
            density === 'compact' ? 'h-10 text-[13px]' : 'h-11 text-sm',
          )}
        >
          만들기
        </button>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-[1fr_1.4fr] gap-2.5', className)}>
      <button
        type="button"
        onClick={onStartCreate}
        className={cn(
          btnH,
          labelCls,
          'flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 font-extrabold text-foreground hover:bg-white/5',
        )}
      >
        <PlusIcon /> 폴더
      </button>
      <button
        type="button"
        onClick={onPickFiles}
        className={cn(
          btnH,
          labelCls,
          'flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary-bright font-extrabold text-background shadow-[0_4px_14px_rgba(29,215,96,0.3)] hover:bg-primary',
        )}
      >
        <UploadIcon /> 업로드
      </button>
    </div>
  )
}

// 작은 인라인 아이콘 — lucide import 추가 비용 줄이려고 path 그대로.
function PlusIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}
