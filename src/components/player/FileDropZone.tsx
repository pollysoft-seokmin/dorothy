import { useCallback, useRef, useState } from 'react'
import { Upload, Music } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { toast } from 'sonner'

const MEDIA_EXTS = new Set(['mp3', 'mp4', 'webm', 'mov'])

interface FileDropZoneProps {
  onMediaLoad: (file: File) => void
  onLrcLoad: (file: File) => void
  fileName: string
}

export function FileDropZone({ onMediaLoad, onLrcLoad, fileName }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const ext = file.name.toLowerCase().split('.').pop() ?? ''
        if (MEDIA_EXTS.has(ext)) {
          onMediaLoad(file)
        } else if (ext === 'lrc') {
          onLrcLoad(file)
        } else {
          toast.error('MP3/MP4/LRC 파일만 지원합니다')
        }
      }
    },
    [onMediaLoad, onLrcLoad],
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
      {/* 데스크톱: Drag & Drop 영역 */}
      <div
        className={cn(
          'hidden sm:flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
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
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          MP3/MP4 또는 LRC 파일을 여기에 드롭하거나 클릭하여 선택
        </p>
        {fileName && (
          <div className="flex items-center gap-1.5 text-xs text-foreground mt-1">
            <Music className="h-3.5 w-3.5" />
            <span className="truncate max-w-[240px]">{fileName}</span>
          </div>
        )}
      </div>

      {/* 모바일: 큰 파일 선택 버튼 */}
      <div className="sm:hidden flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full h-14 text-base gap-2"
          onClick={() => inputRef.current?.click()}
        >
          <Music className="h-5 w-5" />
          파일 선택하기
        </Button>
        {fileName && (
          <p className="text-xs text-muted-foreground truncate text-center">
            {fileName}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.mp4,.webm,.mov,.lrc"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
