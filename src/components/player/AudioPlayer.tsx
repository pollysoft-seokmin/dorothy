import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Maximize2,
  Minimize2,
  Music,
  Play,
  Pause,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { formatTime } from '~/lib/format-time'
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

  // 전체화면 << : 현재 라인 시작에서 0.5초 미만이면 이전 라인으로, 0.5초 이상이면
  // 현재 라인의 처음으로 이동(음악 플레이어의 "이전 곡" 관례). 최신 값은 store 에서
  // 직접 읽어 stale 클로저를 피한다.
  const handlePrevLine = useCallback(() => {
    const { lyrics, currentLineIndex, currentTime } = usePlayerStore.getState()
    const lines = lyrics?.lines
    if (!lines || lines.length === 0) return
    if (currentLineIndex < 0) {
      seek(0)
      return
    }
    const within = currentTime - lines[currentLineIndex].time
    if (within < 0.5) {
      const prev = currentLineIndex - 1
      seek(prev >= 0 ? lines[prev].time : 0)
    } else {
      seek(lines[currentLineIndex].time)
    }
  }, [seek])

  // 전체화면 >> : 다음 라인으로 이동(intro 면 첫 라인).
  const handleNextLine = useCallback(() => {
    const { lyrics, currentLineIndex } = usePlayerStore.getState()
    const lines = lyrics?.lines
    if (!lines || lines.length === 0) return
    const next = currentLineIndex + 1
    if (next < lines.length) seek(lines[next].time)
  }, [seek])

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
          ? 'w-full h-full'
          : // 비전체화면: 영상이 컬럼 폭을 꽉 채운다(split 좌측 패널/단일 컬럼 공통).
            'w-full aspect-video rounded-md',
        isFullscreen && !overlayVisible && 'cursor-none',
      )}
    >
      <video
        ref={mediaRef as React.Ref<HTMLVideoElement>}
        // 영상이 video 박스를 꽉 채우게 한다. <video> 기본값은 object-fit:contain 이라
        // 비율이 다른(예: 4:3) 영상은 좌우/상하에 검은 여백이 생겨 폭을 안 채운다.
        // object-cover 로 박스를 꽉 채우고 비율 차이는 가장자리 크롭으로 흡수(왜곡 없음).
        className="w-full h-full bg-black object-cover"
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

      {/* 전체화면 진입 버튼 — 평상시(비전체화면) 영상 우하단 오버레이. */}
      {!isFullscreen && !isConverting && (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="전체화면"
          title="전체화면"
          className="absolute bottom-2 right-2 rounded-md bg-black/50 p-1.5 text-white hover:bg-black/70"
        >
          <Maximize2 className="size-5" />
        </button>
      )}

      {/* 전체화면 오버레이 — 유튜브 유사. play/stop 중앙, 진행 게이지+옵션 하단.
          컨트롤 영역은 반투명 검정 배경, 모든 아이콘/버튼은 흰색([&_svg]:text-white 로
          공용 컨트롤의 text-primary 까지 일괄 흰색 강제). dark 클래스로 슬라이더 등
          토큰도 다크값을 쓰게 한다. */}
      {isFullscreen && (
        <div
          className={cn(
            'dark absolute inset-0 flex flex-col text-white transition-opacity duration-300 [&_svg]:text-white',
            overlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
          onMouseMove={showOverlay}
        >
          {/* 중앙 컨트롤 — << 이전라인 / play·stop(크게) / >> 다음라인.
              모두 반투명 검정 원 + 흰색 아이콘. play/stop 이 가장 크고 <<·>> 는 약간 작다. */}
          <div className="flex-1 grid place-items-center">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={handlePrevLine}
                disabled={!hasLyricLines}
                aria-label="이전 자막"
                title="이전 자막"
                className="grid size-14 place-items-center rounded-full bg-black/50 text-white hover:bg-black/60 disabled:opacity-40"
              >
                <ChevronsLeft className="size-7" />
              </button>

              <button
                type="button"
                onClick={status === 'playing' ? pause : play}
                disabled={isConverting}
                aria-label={status === 'playing' ? '일시정지' : '재생'}
                className="grid size-24 place-items-center rounded-full bg-black/50 text-white hover:bg-black/60 disabled:opacity-40"
              >
                {status === 'playing' ? (
                  <Pause className="size-11" fill="currentColor" strokeWidth={0} />
                ) : (
                  <Play
                    className="size-11 translate-x-[2px]"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={handleNextLine}
                disabled={!hasLyricLines}
                aria-label="다음 자막"
                title="다음 자막"
                className="grid size-14 place-items-center rounded-full bg-black/50 text-white hover:bg-black/60 disabled:opacity-40"
              >
                <ChevronsRight className="size-7" />
              </button>
            </div>
          </div>

          {/* 하단 바 — 반투명 검정 배경. 현재 가사 1줄 + 진행 게이지 + 시간/옵션/해제 */}
          <div className="bg-black/50 px-6 pb-6 pt-4 flex flex-col gap-2">
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
            <div className="flex items-center justify-between text-white">
              {/* 현재 시간 / 전체 시간 */}
              <span className="text-sm tabular-nums text-white">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex items-center gap-1">
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
                  className="grid size-10 shrink-0 place-items-center rounded-full text-white hover:bg-white/15"
                >
                  <Minimize2 className="size-6" />
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

  // 미디어 블록. video↔audio 사이에서도, 단일↔split 사이에서도 미디어 엘리먼트의
  // children 배열 위치를 안정적으로 유지한다(재마운트=재생 초기화 방지): TrackInfo
  // 다음 고정 위치에 두고, <audio> 는 fragment 의 첫 자식, 앨범 커버는 split 일 때만
  // 뒤에 덧붙인다.
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
        {/* 본문 영역 — 위에서부터 정렬(split 영상도 상단 정렬), 넘치면 스크롤. */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
          {/* 곡 정보(제목 + 즐겨찾기) — 영상 위에 표시. <TrackInfo/> 는 곡 미선택 시
              내부적으로 null 을 반환하지만 children 배열 슬롯은 유지되므로, 아래
              mediaBlock 의 위치(=재마운트 안정성)에는 영향이 없다. */}
          <TrackInfo
            fileName={fileName}
            mediaType={mediaType}
            metadata={metadata}
            favoritable={isLoggedIn && canFavorite}
            isFavorite={isFavorite}
            favoritePending={favoritePending}
            onToggleFavorite={handleToggleFavorite}
          />

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
