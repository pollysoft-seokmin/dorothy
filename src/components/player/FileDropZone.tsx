import { useCallback, useRef, useState } from 'react'
import { Upload, Music } from 'lucide-react'
import { cn } from '~/lib/utils'
import { toast } from 'sonner'

// 받아주는 미디어 파일 확장자. 브라우저 비호환 포맷(.avi/.mkv/.flv/...)은
// useMediaPlayer가 ffmpeg.wasm으로 자동 변환한다.
const MEDIA_EXTS = new Set([
  'mp3',
  'mp4',
  'webm',
  'mov',
  'mpg',
  'mpeg',
  'm4v',
  'avi',
  'mkv',
  'flv',
  'wmv',
  '3gp',
])

interface FileDropZoneProps {
  onMediaLoad: (file: File) => void
  fileName: string
}

export function FileDropZone({ onMediaLoad, fileName }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const ext = file.name.toLowerCase().split('.').pop() ?? ''
        if (MEDIA_EXTS.has(ext)) {
          onMediaLoad(file)
        } else {
          toast.error('지원하지 않는 파일 형식입니다 (오디오/비디오)')
        }
      }
    },
    [onMediaLoad],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [processFiles],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
        e.target.value = ''
      }
    },
    [processFiles],
  )

  return (
    <div className="w-full">
      {/* 데스크톱: Drag & Drop 영역 — 점선 박스 + 그린-소프트 원형 Upload 아이콘 */}
      <div
        className={cn(
          'hidden sm:flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-white/15 bg-white/[0.025] hover:border-white/30',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary-bright">
          <Upload className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          오디오/비디오 파일을 여기에 드롭하거나 클릭하여 선택
        </p>
        <p className="text-[11px] text-text-dim font-mono">
          mp3 · mp4 · webm · mov · mpg
        </p>
        {fileName && (
          <div className="flex items-center gap-1.5 text-xs text-foreground mt-1">
            <Music className="h-3.5 w-3.5" />
            <span className="truncate max-w-[240px]">{fileName}</span>
          </div>
        )}
      </div>

      {/* 모바일: Spotify-style 그린 pill CTA */}
      <div className="sm:hidden flex flex-col gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex h-13 w-full items-center justify-center gap-2 rounded-full',
            'bg-primary-bright text-primary-foreground',
            'text-base font-extrabold tracking-tight',
            'shadow-[0_4px_14px_rgba(29,215,96,0.35)]',
            'transition-transform duration-150 ease-out',
            'hover:scale-[1.02] active:scale-[0.98]',
          )}
          style={{ height: 52 }}
        >
          <Music className="size-5" />
          파일 선택하기
        </button>
        {fileName && (
          <p className="text-xs text-muted-foreground truncate text-center">
            {fileName}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.mp4,.webm,.mov,.mpg,.mpeg,.m4v,.avi,.mkv,.flv,.wmv,.3gp"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
