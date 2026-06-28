import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize, Minimize, Music } from 'lucide-react'
import { cn } from '~/lib/utils'
import { usePlayerStore } from '~/stores/player-store'
import { useFavoritesStore } from '~/stores/favorites-store'
import type { useMediaPlayer } from '~/hooks/useMediaPlayer'
import { useKeyboardShortcuts } from '~/hooks/useKeyboardShortcuts'
import { usePreferencesSync } from '~/hooks/usePreferencesSync'
import { usePlaybackHistorySync } from '~/hooks/usePlaybackHistorySync'
import { useIsLgUp } from '~/hooks/useIsLgUp'
import { useFullscreen } from '~/hooks/useFullscreen'
import { FileDropZone } from './FileDropZone'
import { TrackInfo } from './TrackInfo'
import { PlaybackControls } from './PlaybackControls'
import { RepeatControl } from './RepeatControl'
import { ProgressBar } from './ProgressBar'
import { TimeDisplay } from './TimeDisplay'
import { LanguageToggle } from './LanguageToggle'
import { ExposeToggle } from './ExposeToggle'
import { LyricsPanel, pickLineTexts } from '~/components/lyrics/LyricsPanel'

type Props = {
  player: ReturnType<typeof useMediaPlayer>
  isLoggedIn: boolean
}

// 마우스 유휴 시 오버레이를 숨기기까지의 지연(ms) — 유튜브 유사.
const OVERLAY_HIDE_MS = 2500

export function AudioPlayer({ player, isLoggedIn }: Props) {
  const { mediaRef, play, pause, seek, loadFile } = player

  const status = usePlayerStore((s) => s.status)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const isConverting = usePlayerStore((s) => s.isConverting)
  const conversionProgress = usePlayerStore((s) => s.conversionProgress)
  const repeatCount = usePlayerStore((s) => s.repeatCount)
  const fileName = usePlayerStore((s) => s.fileName)
  const mediaType = usePlayerStore((s) => s.mediaType)
  const metadata = usePlayerStore((s) => s.metadata)
  const source = usePlayerStore((s) => s.source)
  const providerFileId = usePlayerStore((s) => s.providerFileId)
  const providerLrcFileId = usePlayerStore((s) => s.providerLrcFileId)
  const mimeType = usePlayerStore((s) => s.mimeType)
  const lyrics = usePlayerStore((s) => s.lyrics)
  const currentLineIndex = usePlayerStore((s) => s.currentLineIndex)
  const checkedLines = usePlayerStore((s) => s.checkedLines)
  const lineMaskStates = usePlayerStore((s) => s.lineMaskStates)
  const globalLineMask = usePlayerStore((s) => s.globalLineMask)
  const lyricsLoading = usePlayerStore((s) => s.lyricsLoading)
  const lyricsLanguage = usePlayerStore((s) => s.lyricsLanguage)

  // SAMI 자막 여부 판정 — 한 라인이라도 en/ko 별도 필드를 가지면 SAMI 소스.
  // 없으면 LRC이거나 가사가 비어있는 상태 → 언어 토글 비활성.
  const isSamiLyrics =
    !!lyrics?.lines.some((l) => l.en !== undefined || l.ko !== undefined)
  // 노출 토글은 LRC/SAMI 무관하게 가사가 있을 때만 의미가 있다.
  const hasLyricLines = !!lyrics && lyrics.lines.length > 0

  const hasFile = !!fileName
  const disabled = !hasFile

  // 넓은 화면(lg+)에서는 항상 2단(split)으로 본다 — 좌측은 비디오(또는 앨범 커버),
  // 우측은 자막 목록 + 재생 컨트롤. 좁은 화면/곡 미선택이면 단일 컬럼으로 강등한다.
  const isLgUp = useIsLgUp()
  const splitActive = isLgUp && hasFile

  // 동영상 전체화면 — Fullscreen API 로 stage 컨테이너를 띄운다. DOM 위치를 옮기지
  // 않으므로 안의 <video> 가 재마운트되지 않아 재생이 끊기지 않는다.
  const stageRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(stageRef)

  // 전체화면 오버레이(컨트롤/가사) 자동 숨김. 재생 중에만 일정 시간 뒤 숨기고,
  // 일시정지/정지면 계속 표시한다(유튜브 유사).
  const [overlayVisible, setOverlayVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showOverlay = useCallback(() => {
    setOverlayVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (usePlayerStore.getState().status === 'playing') {
      hideTimerRef.current = setTimeout(
        () => setOverlayVisible(false),
        OVERLAY_HIDE_MS,
      )
    }
  }, [])
  // 전체화면 진입/상태 변화 시 오버레이를 다시 표시(+재생 중이면 숨김 타이머 재무장).
  useEffect(() => {
    if (!isFullscreen) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setOverlayVisible(true)
      return
    }
    showOverlay()
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [isFullscreen, status, showOverlay])

  // 즐겨찾기 — Google Drive에서 로드된 재생 가능 파일만 별을 노출/토글한다.
  const favItems = useFavoritesStore((s) => s.items)
  const favPendingIds = useFavoritesStore((s) => s.pendingIds)
  const loadFavorites = useFavoritesStore((s) => s.load)
  const toggleFavorite = useFavoritesStore((s) => s.toggle)
  const canFavorite = source === 'google_drive' && !!providerFileId && !!fileName
  const isFavorite = canFavorite && favItems.some((i) => i.fileId === providerFileId)
  const favoritePending =
    canFavorite && !!providerFileId && favPendingIds.has(providerFileId)

  // 로그인 사용자는 별 상태를 즉시 보여줄 수 있도록 마운트 시 목록을 한 번 적재.
  useEffect(() => {
    if (isLoggedIn) void loadFavorites()
  }, [isLoggedIn, loadFavorites])

  const handleToggleFavorite = useCallback(() => {
    if (!canFavorite || !providerFileId) return
    void toggleFavorite({
      fileId: providerFileId,
      name: fileName,
      mediaType,
      mimeType,
      lrcFileId: providerLrcFileId,
    })
  }, [
    canFavorite,
    fileName,
    mediaType,
    mimeType,
    providerFileId,
    providerLrcFileId,
    toggleFavorite,
  ])

  const handleMediaLoad = useCallback(
    (file: File) => loadFile(file),
    [loadFile],
  )

  const handleSeek = useCallback(
    (time: number) => seek(time),
    [seek],
  )

  const handleCycleRepeat = useCallback(() => {
    usePlayerStore.getState().cycleRepeat()
  }, [])

  const handleToggleCheck = useCallback((index: number) => {
    usePlayerStore.getState().toggleCheckedLine(index)
  }, [])

  const handleMaskToggle = useCallback((index: number) => {
    usePlayerStore.getState().cycleLineMask(index)
  }, [])

  const handleCycleLyricsLanguage = useCallback(() => {
    usePlayerStore.getState().cycleLyricsLanguage()
  }, [])

  const handleCycleGlobalLineMask = useCallback(() => {
    usePlayerStore.getState().cycleGlobalLineMask()
  }, [])

  const handleLineClick = useCallback(
    (time: number) => {
      seek(time)
      if (status !== 'playing') play()
    },
    [seek, play, status],
  )

  useKeyboardShortcuts({ play, pause, seek })
  usePreferencesSync()
  usePlaybackHistorySync()

  // 가사 패널 — 단일 컬럼에서는 본문 안에, split 에서는 우측 패인에 렌더한다.
  // props 가 동일하므로 한 번 만들어 두 슬롯에서 재사용한다.
  const lyricsPanel = (
    <LyricsPanel
      lyrics={lyrics}
      currentLineIndex={currentLineIndex}
      checkedLines={checkedLines}
      lineMaskStates={lineMaskStates}
      globalLineMask={globalLineMask}
      language={lyricsLanguage}
      loading={lyricsLoading}
      onLineClick={handleLineClick}
      onToggleCheck={handleToggleCheck}
      onMaskToggle={handleMaskToggle}
    />
  )

  // 재생 컨트롤(진행 게이지 + 시간 + 버튼). 단일 컬럼에서는 본문 하단에, split 에서는
  // 우측 자막 패인 하단에 붙인다. 한 번 만들어 재사용한다. iOS home indicator 기기는
  // safe-area-inset 으로, 그 외 모바일은 최소 24px 여백을 둔다. 데스크톱은 외곽
  // py-10 에서 처리하므로 sm:pb-0.
  const bottomControls = (
    <div className="bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-0 flex flex-col">
      <div className="flex flex-col gap-1">
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          disabled={disabled}
          onSeek={handleSeek}
          isConverting={isConverting}
          conversionProgress={conversionProgress}
        />
        <TimeDisplay
          currentTime={currentTime}
          duration={duration}
          isConverting={isConverting}
          conversionProgress={conversionProgress}
        />
      </div>

      {/* 컨트롤 — 3-col grid로 Play/Pause를 시각적 중앙에 고정. */}
      <div className="grid grid-cols-3 items-center">
        <div className="justify-self-start flex items-center gap-1">
          <RepeatControl
            repeatCount={repeatCount}
            hasCheckedLines={checkedLines.size > 0}
            disabled={disabled}
            onCycleRepeat={handleCycleRepeat}
          />
        </div>
        <div className="justify-self-center">
          <PlaybackControls
            status={status}
            disabled={disabled || isConverting}
            onPlay={play}
            onPause={pause}
          />
        </div>
        <div className="justify-self-end flex items-center gap-1">
          <ExposeToggle
            globalLineMask={globalLineMask}
            disabled={!hasLyricLines}
            onCycle={handleCycleGlobalLineMask}
          />
          <LanguageToggle
            language={lyricsLanguage}
            disabled={!isSamiLyrics}
            onCycle={handleCycleLyricsLanguage}
          />
        </div>
      </div>
    </div>
  )

  // 전체화면 오버레이용 현재 가사 1줄(언어 토글 반영).
  const currentLine =
    currentLineIndex >= 0 && lyrics ? lyrics.lines[currentLineIndex] : undefined
  const overlayLine = currentLine
    ? pickLineTexts(currentLine, lyricsLanguage)
    : null

  // 비디오 stage — 단일 컬럼/split 좌측/전체화면에서 모두 쓰이는 동일 컨테이너.
  // 전체화면 진입 시 이 div 가 그대로 확대되므로 안의 <video> 재마운트가 없다.
  const videoStage = (
    <div
      ref={stageRef}
      onMouseMove={isFullscreen ? showOverlay : undefined}
      className={cn(
        'relative bg-black overflow-hidden',
        isFullscreen
          ? 'w-full h-full grid place-items-center'
          : // split 좌측 패널에서는 영상 폭을 320px 로 고정한다. 단일 컬럼/전체화면은
            // 폭을 채운다.
            splitActive
            ? 'w-[320px] max-w-full aspect-video rounded-md'
            : 'w-full aspect-video rounded-md',
        isFullscreen && !overlayVisible && 'cursor-none',
      )}
    >
      <video
        ref={mediaRef as React.Ref<HTMLVideoElement>}
        className={
          isFullscreen
            ? 'max-h-full max-w-full object-contain'
            : 'w-full h-full bg-black'
        }
        preload="metadata"
        playsInline
      />

      {isConverting && (
        <div className="absolute inset-0 grid place-items-center bg-black/70">
          <p className="px-6 text-center text-sm text-white/80">
            재생 가능한 형식으로 변환 중…
          </p>
        </div>
      )}

      {/* 전체화면 진입 버튼 — 평상시(비전체화면) 우하단. */}
      {!isFullscreen && !isConverting && (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="전체화면"
          title="전체화면"
          className="absolute bottom-2 right-2 rounded-md bg-black/50 p-1.5 text-white hover:bg-black/70"
        >
          <Maximize className="size-5" />
        </button>
      )}

      {/* 전체화면 오버레이 — 유튜브 유사. play/stop 중앙, 진행 게이지+옵션 하단.
          dark 클래스로 항상 다크 토큰을 강제해 어두운 영상 위에서도 컨트롤이 보이게 한다. */}
      {isFullscreen && (
        <div
          className={cn(
            'dark absolute inset-0 flex flex-col text-white transition-opacity duration-300',
            overlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
          onMouseMove={showOverlay}
        >
          {/* 중앙 play/stop */}
          <div className="flex-1 grid place-items-center">
            <PlaybackControls
              status={status}
              disabled={isConverting}
              onPlay={play}
              onPause={pause}
            />
          </div>

          {/* 하단 바 — 현재 가사 1줄 + 진행 게이지 + 시간/옵션/전체화면 해제 */}
          <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 pb-6 pt-16 flex flex-col gap-2">
            {overlayLine?.primary && (
              <div className="mb-1 text-center drop-shadow">
                <p className="text-lg font-medium">{overlayLine.primary}</p>
                {overlayLine.secondary && (
                  <p className="text-sm text-white/70">{overlayLine.secondary}</p>
                )}
              </div>
            )}
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              disabled={disabled}
              onSeek={handleSeek}
              isConverting={isConverting}
              conversionProgress={conversionProgress}
            />
            <div className="flex items-center justify-between">
              <TimeDisplay
                currentTime={currentTime}
                duration={duration}
                isConverting={isConverting}
                conversionProgress={conversionProgress}
              />
              <div className="flex items-center gap-1">
                <RepeatControl
                  repeatCount={repeatCount}
                  hasCheckedLines={checkedLines.size > 0}
                  disabled={disabled}
                  onCycleRepeat={handleCycleRepeat}
                />
                <ExposeToggle
                  globalLineMask={globalLineMask}
                  disabled={!hasLyricLines}
                  onCycle={handleCycleGlobalLineMask}
                />
                <LanguageToggle
                  language={lyricsLanguage}
                  disabled={!isSamiLyrics}
                  onCycle={handleCycleLyricsLanguage}
                />
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label="전체화면 해제"
                  title="전체화면 해제"
                  className="grid size-10 shrink-0 place-items-center rounded-full text-primary hover:bg-foreground/10"
                >
                  <Minimize className="size-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // 앨범 커버 — 오디오 split 좌측 패널. 좌측 영상(320px)과 폭을 맞춘다. 아트가
  // 없으면 음표 플레이스홀더.
  const albumCover = (
    <div className="mx-auto grid aspect-square w-[320px] max-w-full place-items-center overflow-hidden rounded-lg bg-muted">
      {metadata?.albumArt ? (
        <img
          src={metadata.albumArt}
          alt="Album art"
          className="h-full w-full object-cover"
        />
      ) : (
        <Music className="size-16 text-muted-foreground" />
      )}
    </div>
  )

  // 미디어 블록(본문 컬럼 첫 자식). video↔audio 사이에서도, 단일↔split 사이에서도
  // 미디어 엘리먼트의 트리 위치를 안정적으로 유지한다(재마운트=재생 초기화 방지):
  // <audio> 는 항상 첫 자식으로 두고, 앨범 커버는 split 일 때만 뒤에 덧붙인다.
  const mediaBlock =
    mediaType === 'video' ? (
      videoStage
    ) : (
      <>
        <audio ref={mediaRef as React.Ref<HTMLAudioElement>} preload="metadata" />
        {splitActive && albumCover}
      </>
    )

  return (
    // h-full로 사용 가능한 세로 공간 전부 차지. split 은 더 넓은 컨테이너에서 좌(본문)/
    // 우(자막)로 분할한다.
    <div
      className={
        splitActive
          ? 'mx-auto w-full max-w-6xl px-4 py-6 sm:py-10 h-full flex flex-row gap-6'
          : 'mx-auto w-full max-w-2xl px-4 pt-6 pb-0 sm:py-10 h-full flex flex-col'
      }
    >
      {/* 본문(좌측) 컬럼. media 엘리먼트의 조상 체인(이 div → stage → media)을 두
          레이아웃에서 동일하게 유지해, 화면 폭 변화 시 재마운트(=재생 초기화)를 막는다. */}
      <div
        className={
          splitActive
            ? 'w-[360px] shrink-0 min-h-0 flex flex-col gap-4'
            : 'flex-1 min-h-0 flex flex-col gap-8'
        }
      >
        {/* 본문 스크롤/정렬 영역. split 에선 세로 가운데 정렬, 단일에선 스크롤. */}
        <div
          className={
            splitActive
              ? 'flex-1 min-h-0 flex flex-col justify-center gap-4'
              : 'flex-1 min-h-0 overflow-y-auto flex flex-col gap-4'
          }
        >
          {mediaBlock}

          {/* 파일 선택 — 비로그인 사용자만. 로그인 시에는 라이브러리에서 처리 */}
          {!isLoggedIn && (
            <FileDropZone onMediaLoad={handleMediaLoad} fileName={fileName} />
          )}

          {/* 로그인 + 곡 미선택 — 라이브러리에서 선택하라는 행동 유도 (#96). */}
          {isLoggedIn && !fileName && (
            <p className="flex-1 grid place-items-center px-6 text-center text-sm text-muted-foreground">
              내 미디어에서 재생할 오디오/비디오를 선택하세요.
            </p>
          )}

          {/* 곡 정보 */}
          <TrackInfo
            fileName={fileName}
            mediaType={mediaType}
            metadata={metadata}
            favoritable={isLoggedIn && canFavorite}
            isFavorite={isFavorite}
            favoritePending={favoritePending}
            onToggleFavorite={handleToggleFavorite}
          />

          {/* 가사 — 단일 컬럼에서만 본문 안에 둔다(split 은 우측 패인). */}
          {!splitActive && lyricsPanel}
        </div>

        {/* 재생 컨트롤 — 단일 컬럼에서는 본문 하단. split 에서는 우측 패인으로 이동. */}
        {!splitActive && bottomControls}
      </div>

      {/* 우측 패인 — split 에서만 자막 목록 + 재생 컨트롤. media 조상 체인 안정화를
          위해 패인 자체는 항상 트리에 두고 가시성/내용만 분기한다. */}
      <div
        className={
          splitActive ? 'flex-1 min-w-0 min-h-0 flex flex-col gap-4' : 'hidden'
        }
      >
        {splitActive && lyricsPanel}
        {splitActive && bottomControls}
      </div>
    </div>
  )
}
