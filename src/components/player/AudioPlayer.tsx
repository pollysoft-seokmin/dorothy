import { useCallback, useRef } from 'react'
import { Toaster } from 'sonner'
import { usePlayerStore } from '~/stores/player-store'
import { useMediaPlayer } from '~/hooks/useMediaPlayer'
import { useLyrics } from '~/hooks/useLyrics'
import { useKeyboardShortcuts } from '~/hooks/useKeyboardShortcuts'
import { FileDropZone } from './FileDropZone'
import { TrackInfo } from './TrackInfo'
import { PlaybackControls } from './PlaybackControls'
import { ProgressBar } from './ProgressBar'
import { TimeDisplay } from './TimeDisplay'
import { VolumeControl } from './VolumeControl'
import { SectionRepeatControls } from './SectionRepeatControls'
import { LyricsPanel } from '~/components/lyrics/LyricsPanel'

export function AudioPlayer() {
  const { mediaRef, play, pause, stop, seek, loadFile } = useMediaPlayer()
  const { loadLrcFile } = useLyrics()
  const lrcInputRef = useRef<HTMLInputElement>(null)

  const status = usePlayerStore((s) => s.status)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const isMuted = usePlayerStore((s) => s.isMuted)
  const isLooping = usePlayerStore((s) => s.isLooping)
  const fileName = usePlayerStore((s) => s.fileName)
  const mediaType = usePlayerStore((s) => s.mediaType)
  const metadata = usePlayerStore((s) => s.metadata)
  const lyrics = usePlayerStore((s) => s.lyrics)
  const currentLineIndex = usePlayerStore((s) => s.currentLineIndex)
  const checkedLines = usePlayerStore((s) => s.checkedLines)
  const sectionRepeatCount = usePlayerStore((s) => s.sectionRepeatCount)

  const hasFile = !!fileName
  const disabled = !hasFile

  const handleMp3Load = useCallback(
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

  const handleVolumeChange = useCallback((v: number) => {
    usePlayerStore.getState().setVolume(v)
  }, [])

  const handleToggleMute = useCallback(() => {
    usePlayerStore.getState().toggleMute()
  }, [])

  const handleToggleLoop = useCallback(() => {
    usePlayerStore.getState().toggleLoop()
  }, [])

  const handleToggleCheck = useCallback((index: number) => {
    usePlayerStore.getState().toggleCheckedLine(index)
  }, [])

  const handleClearCheckedLines = useCallback(() => {
    usePlayerStore.getState().clearCheckedLines()
  }, [])

  const handleIncrementRepeat = useCallback(() => {
    const current = usePlayerStore.getState().sectionRepeatCount
    usePlayerStore.getState().setSectionRepeatCount(current + 1)
  }, [])

  const handleDecrementRepeat = useCallback(() => {
    const current = usePlayerStore.getState().sectionRepeatCount
    usePlayerStore.getState().setSectionRepeatCount(current - 1)
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10 flex flex-col gap-4">
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

      {/* 숨겨진 LRC input */}
      <input
        ref={lrcInputRef}
        type="file"
        accept=".lrc"
        className="hidden"
        onChange={handleLrcInputChange}
      />

      {/* 헤더 */}
      <h1 className="text-xl font-bold text-center">Dorothy</h1>

      {/* 파일 선택 */}
      <FileDropZone
        onMp3Load={handleMp3Load}
        onLrcLoad={handleLrcLoad}
        fileName={fileName}
      />

      {/* 곡 정보 */}
      <TrackInfo fileName={fileName} metadata={metadata} />

      {/* 가사 패널 */}
      <LyricsPanel
        lyrics={lyrics}
        currentLineIndex={currentLineIndex}
        checkedLines={checkedLines}
        onLineClick={handleLineClick}
        onToggleCheck={handleToggleCheck}
        onAddLrc={handleAddLrc}
      />

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

      {/* 하단 컨트롤 - 모바일에서 sticky bottom */}
      <div className="flex items-center justify-between sticky bottom-0 sm:static bg-background pb-2 sm:pb-0">
        <PlaybackControls
          status={status}
          isLooping={isLooping}
          disabled={disabled}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onToggleLoop={handleToggleLoop}
        />
        {lyrics && (
          <SectionRepeatControls
            repeatCount={sectionRepeatCount}
            hasCheckedLines={checkedLines.size > 0}
            onIncrement={handleIncrementRepeat}
            onDecrement={handleDecrementRepeat}
            onClearAll={handleClearCheckedLines}
          />
        )}
        <VolumeControl
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
        />
      </div>

      <Toaster position="bottom-center" />
    </div>
  )
}
