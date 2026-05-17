import { useCallback, useRef } from 'react'
import { usePlayerStore } from '~/stores/player-store'
import type { useMediaPlayer } from '~/hooks/useMediaPlayer'
import { useLyrics } from '~/hooks/useLyrics'
import { useKeyboardShortcuts } from '~/hooks/useKeyboardShortcuts'
import { usePreferencesSync } from '~/hooks/usePreferencesSync'
import { usePlaybackHistorySync } from '~/hooks/usePlaybackHistorySync'
import { FileDropZone } from './FileDropZone'
import { TrackInfo } from './TrackInfo'
import { PlaybackControls } from './PlaybackControls'
import { RepeatControl } from './RepeatControl'
import { ProgressBar } from './ProgressBar'
import { TimeDisplay } from './TimeDisplay'
import { LanguageToggle } from './LanguageToggle'
import { ExposeToggle } from './ExposeToggle'
import { LyricsPanel } from '~/components/lyrics/LyricsPanel'

type Props = {
  player: ReturnType<typeof useMediaPlayer>
  isLoggedIn: boolean
}

export function AudioPlayer({ player, isLoggedIn }: Props) {
  const { mediaRef, play, pause, seek, loadFile } = player
  const { loadLrcFile } = useLyrics()
  const lrcInputRef = useRef<HTMLInputElement>(null)

  const status = usePlayerStore((s) => s.status)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const repeatCount = usePlayerStore((s) => s.repeatCount)
  const fileName = usePlayerStore((s) => s.fileName)
  const mediaType = usePlayerStore((s) => s.mediaType)
  const metadata = usePlayerStore((s) => s.metadata)
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

  const handleMediaLoad = useCallback(
    (file: File) => loadFile(file),
    [loadFile],
  )

  const handleLrcLoad = useCallback(
    (file: File) => loadLrcFile(file),
    [loadLrcFile],
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

  const handleAddLrc = useCallback(() => {
    lrcInputRef.current?.click()
  }, [])

  const handleLrcInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        loadLrcFile(file)
        e.target.value = ''
      }
    },
    [loadLrcFile],
  )

  useKeyboardShortcuts({ play, pause, seek })
  usePreferencesSync()
  usePlaybackHistorySync()

  return (
    // h-full로 사용 가능한 세로 공간 전부 차지 — 모바일/데스크톱 통일.
    // 외곽 sm:py-10은 데스크톱에서 위/아래 breathing room 보존.
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-0 sm:py-10 h-full flex flex-col gap-8">
      {/* 스크롤 가능한 상단 영역 — 콘텐츠가 넘치면 여기서만 스크롤되고
          페이지는 스크롤되지 않는다. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
        {/* 미디어 엘리먼트: 비디오는 표시, 오디오는 숨김 */}
        {mediaType === 'video' ? (
          <video
            ref={mediaRef as React.Ref<HTMLVideoElement>}
            className="w-full aspect-video bg-black rounded-md"
            preload="metadata"
            playsInline
          />
        ) : (
          <audio
            ref={mediaRef as React.Ref<HTMLAudioElement>}
            preload="metadata"
          />
        )}

        {/* 숨겨진 LRC input — 비로그인 사용자만 */}
        {!isLoggedIn && (
          <input
            ref={lrcInputRef}
            type="file"
            accept=".lrc"
            className="hidden"
            onChange={handleLrcInputChange}
          />
        )}

        {/* 파일 선택 — 비로그인 사용자만. 로그인 시에는 우측 라이브러리에서 처리 */}
        {!isLoggedIn && (
          <FileDropZone
            onMediaLoad={handleMediaLoad}
            onLrcLoad={handleLrcLoad}
            fileName={fileName}
          />
        )}

        {/* 곡 정보 */}
        <TrackInfo
          fileName={fileName}
          mediaType={mediaType}
          metadata={metadata}
        />

        {/* 가사 패널 */}
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
          onAddLrc={isLoggedIn ? undefined : handleAddLrc}
        />
      </div>

      {/* 하단 영역 - 진행 게이지 + 시간 + 컨트롤. 진행 게이지와 컨트롤은
          시각적으로 한 덩어리이므로 gap 없음. iOS home indicator 영역을 피해
          safe-area-inset-bottom 만큼 하단 패딩 (데스크톱은 외곽 py-10에서 처리). */}
      <div className="bg-background pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-0 flex flex-col">
        {/* Progress Bar */}
        <div className="flex flex-col gap-1">
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            disabled={disabled}
            onSeek={handleSeek}
          />
          <TimeDisplay currentTime={currentTime} duration={duration} />
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
              disabled={disabled}
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
    </div>
  )
}
