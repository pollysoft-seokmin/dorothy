import { useCallback, useRef, useState } from 'react'
import { Music } from 'lucide-react'
import { cn } from '~/lib/utils'
import { toast } from 'sonner'
import { LibraryEmptyDropZone } from '~/components/library/library-atoms'

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
      {/* 데스크톱: 빈 폴더(LibraryEmptyDropZone)와 동일한 드롭존 — 드래그&드롭 직접 처리 */}
      <div className="hidden sm:block w-full">
        <LibraryEmptyDropZone
          onPickFiles={() => inputRef.current?.click()}
          dragging={isDragging}
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
        />
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
