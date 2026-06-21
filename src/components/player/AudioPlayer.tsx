import { useCallback, useEffect } from 'react'
import { usePlayerStore } from '~/stores/player-store'
import { useFavoritesStore } from '~/stores/favorites-store'
import type { useMediaPlayer } from '~/hooks/useMediaPlayer'
import { useKeyboardShortcuts } from '~/hooks/useKeyboardShortcuts'
import { usePreferencesSync } from '~/hooks/usePreferencesSync'
import { usePlaybackHistorySync } from '~/hooks/usePlaybackHistorySync'
import { useIsLgUp } from '~/hooks/useIsLgUp'
import { FileDropZone } from './FileDropZone'
import { TrackInfo } from './TrackInfo'
import { PlaybackControls } from './PlaybackControls'
import { RepeatControl } from './RepeatControl'
import { ProgressBar } from './ProgressBar'
import { TimeDisplay } from './TimeDisplay'
import { LanguageToggle } from './LanguageToggle'
import { ExposeToggle } from './ExposeToggle'
import { ViewModeToggle } from './ViewModeToggle'
import { LyricsPanel } from '~/components/lyrics/LyricsPanel'

type Props = {
  player: ReturnType<typeof useMediaPlayer>
  isLoggedIn: boolean
}

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
  const viewMode = usePlayerStore((s) => s.viewMode)

  // SAMI 자막 여부 판정 — 한 라인이라도 en/ko 별도 필드를 가지면 SAMI 소스.
  // 없으면 LRC이거나 가사가 비어있는 상태 → 언어 토글 비활성.
  const isSamiLyrics =
    !!lyrics?.lines.some((l) => l.en !== undefined || l.ko !== undefined)
  // 노출 토글은 LRC/SAMI 무관하게 가사가 있을 때만 의미가 있다.
  const hasLyricLines = !!lyrics && lyrics.lines.length > 0

  const hasFile = !!fileName
  const disabled = !hasFile

  // 넓은 화면(lg+) 2단 보기. 좌측 320px 영상 + 우측 자막 목록. 비디오가 있을 때만
  // 의미가 있으므로 오디오 전용/곡 미선택이면 기본(단일 컬럼)으로 자연 강등한다.
  const isLgUp = useIsLgUp()
  const canSplit = isLgUp && hasFile && mediaType === 'video'
  const splitActive = canSplit && viewMode === 'split'
  const handleCycleViewMode = useCallback(() => {
    usePlayerStore.getState().cycleViewMode()
  }, [])

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

  // 가사 패널 — 기본 모드에서는 본문 컬럼 안에, split 모드에서는 우측 패인에
  // 렌더한다. props 가 동일하므로 한 번 만들어 두 슬롯에서 재사용한다.
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

  return (
    // h-full로 사용 가능한 세로 공간 전부 차지 — 모바일/데스크톱 통일.
    // 외곽 sm:py-10은 데스크톱에서 위/아래 breathing room 보존.
    // split 모드는 더 넓은 컨테이너에서 좌(본문)/우(자막)로 분할한다.
    <div
      className={
        splitActive
          ? 'mx-auto w-full max-w-6xl px-4 py-6 sm:py-10 h-full flex flex-row gap-6'
          : 'mx-auto w-full max-w-2xl px-4 pt-6 pb-0 sm:py-10 h-full flex flex-col'
      }
    >
      {/* 본문 컬럼. media 엘리먼트의 조상 체인(이 div → 스크롤 영역 → video)을 두
          모드에서 동일하게 유지해, 뷰 토글 시 video 재마운트(=재생 초기화)를 막는다.
          split 에선 좌측 360px 고정 컬럼, 기본 모드에선 풀폭 단일 컬럼. */}
      <div
        className={
          splitActive
            ? 'w-[360px] shrink-0 min-h-0 flex flex-col gap-4'
            : 'flex-1 min-h-0 flex flex-col gap-8'
        }
      >
        {/* 스크롤 가능한 상단 영역 — 콘텐츠가 넘치면 여기서만 스크롤되고
            페이지는 스크롤되지 않는다. */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
          {/* 미디어 엘리먼트: 비디오는 표시, 오디오는 숨김 */}
          {mediaType === 'video' ? (
            // 변환 중에는 비디오 영역을 디밍하고 안내 문구를 띄운다. 진행률은
            // 하단 progress bar / 시간 표시 위치를 재활용해 보여준다.
            // split 모드에선 영상을 320px 폭으로 고정한다.
            <div
              className={`relative aspect-video ${splitActive ? 'w-[320px] max-w-full' : 'w-full'}`}
            >
              <video
                ref={mediaRef as React.Ref<HTMLVideoElement>}
                className="w-full h-full bg-black rounded-md"
                preload="metadata"
                playsInline
              />
              {isConverting && (
                <div className="absolute inset-0 grid place-items-center rounded-md bg-black/70">
                  <p className="px-6 text-center text-sm text-white/80">
                    재생 가능한 형식으로 변환 중…
                  </p>
                </div>
              )}
            </div>
          ) : (
            <audio
              ref={mediaRef as React.Ref<HTMLAudioElement>}
              preload="metadata"
            />
          )}

          {/* 파일 선택 — 비로그인 사용자만. 로그인 시에는 우측 라이브러리에서 처리 */}
          {!isLoggedIn && (
            <FileDropZone
              onMediaLoad={handleMediaLoad}
              fileName={fileName}
            />
          )}

          {/* 로그인 + 곡 미선택 — 라이브러리에서 선택하라는 행동 유도 (#96).
              본문이 통째로 비는 빈 상태를 채우기 위해 flex-1 + 가운데 정렬. */}
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

          {/* 가사 패널 — 기본 모드에서만 본문 컬럼 안에 둔다(split 은 우측 패인). */}
          {!splitActive && lyricsPanel}
        </div>

        {/* 하단 영역 - 진행 게이지 + 시간 + 컨트롤. 진행 게이지와 컨트롤은
            시각적으로 한 덩어리이므로 gap 없음. iOS home indicator 가 있는 기기는
            safe-area-inset 으로, 그 외 모바일 viewport(안드로이드 등)는 최소 24px
            여백을 둬 화면 하단에 컨트롤이 붙지 않게 한다. 데스크톱은 외곽 py-10
            (40px) 에서 처리하므로 sm:pb-0. */}
        <div className="bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-0 flex flex-col">
          {/* Progress Bar */}
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

          {/* 컨트롤 — 3-col grid로 Play/Pause를 시각적 중앙에 고정하고
              좌우 그룹의 폭 차이에 흔들리지 않게 한다. */}
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
              {/* 뷰 모드 토글 — 2단이 의미 있는 넓은 화면 + 비디오일 때만 노출 */}
              {canSplit && (
                <ViewModeToggle
                  viewMode={viewMode}
                  onCycle={handleCycleViewMode}
                />
              )}
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
      </div>

      {/* 우측 패인 — split 에서만 자막 목록. media 조상 체인 안정화를 위해 패인
          자체는 항상 트리에 두고 가시성/내용만 분기한다. */}
      <div className={splitActive ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
        {splitActive && lyricsPanel}
      </div>
    </div>
  )
}
