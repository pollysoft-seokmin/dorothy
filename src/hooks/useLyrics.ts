import { useCallback } from 'react'
import { usePlayerStore } from '~/stores/player-store'
import { parseLrc } from '~/lib/lrc-parser'
import { toast } from 'sonner'

export function useLyrics() {
  const loadLrcFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string

      // UTF-8 깨짐 간단 체크 (replacement character)
      if (text.includes('\uFFFD')) {
        toast.error('UTF-8이 아닌 파일은 지원하지 않습니다')
        return
      }

      try {
        const lyrics = parseLrc(text)
        if (lyrics.lines.length === 0) {
          toast.error('LRC 파일을 파싱할 수 없습니다')
          return
        }
        usePlayerStore.getState().loadLyrics(lyrics)
      } catch {
        toast.error('LRC 파일을 파싱할 수 없습니다')
      }
    }
    reader.onerror = () => {
      toast.error('파일을 읽을 수 없습니다')
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  return { loadLrcFile }
}
