import { useCallback, useEffect, useRef, useState } from 'react'
import { Music } from 'lucide-react'
import { cn } from '~/lib/utils'
import { toast } from 'sonner'
import { LibraryEmptyDropZone } from '~/components/library/library-atoms'
import { useUiStore } from '~/stores/ui-store'

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

  // 상단 툴바의 "+" 버튼(AuthHeader, 다른 트리)이 ui-store nonce 를 올리면
  // 파일 선택창을 연다 — 콘텐츠 로딩 후 안내 UI 가 숨겨진 상태에서도 교체 가능 (#105).
  // 마운트 시점 nonce 를 "처리 완료"로 기록해 두고, 값이 실제로 바뀐 경우에만
  // 연다. boolean "첫 실행 스킵" 가드는 StrictMode 의 effect 2회 실행 때
  // 두 번째에서 발사돼 로그인/로그아웃 마운트마다 파일창이 뜨는 문제가 있었다.
  const mediaPickNonce = useUiStore((s) => s.mediaPickNonce)
  const handledNonce = useRef(mediaPickNonce)
  useEffect(() => {
    if (mediaPickNonce === handledNonce.current) return
    handledNonce.current = mediaPickNonce
    inputRef.current?.click()
  }, [mediaPickNonce])

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
    // 파일 미선택(빈 상태)일 때는 가용 세로 공간을 채워 모바일 CTA를 화면 중앙에
    // 배치한다. 파일이 로드되면 일반 흐름으로 되돌려 플레이어 콘텐츠를 가리지 않는다.
    <div className={cn('w-full', !fileName && 'flex flex-1 flex-col')}>
      {/* 콘텐츠가 로딩되면 안내 UI 는 숨기고, 교체는 상단 "+" 버튼으로 한다 (#105). */}
      {!fileName && (
        <>
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

          {/* 모바일: Spotify-style 그린 pill CTA — 빈 상태에선 화면 중앙 정렬 */}
          <div className="sm:hidden flex flex-1 flex-col items-center justify-center gap-2">
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
          </div>
        </>
      )}

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
