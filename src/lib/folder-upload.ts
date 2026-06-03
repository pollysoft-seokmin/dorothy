// 폴더 구조 업로드 — 파일 선택(webkitdirectory) 과 드래그앤드롭(폴더) 두 경로에서
// 공통으로 쓰는 "파일 + 상대 폴더 경로" 추출 헬퍼. relPath 는 파일이 들어갈
// 폴더 세그먼트 배열(파일명 제외). 최상위 파일이면 빈 배열.

export type UploadEntry = { file: File; relPath: string[] }

const MAX_DEPTH = 16

// OS/도구가 만든 숨김·시스템 파일은 업로드 대상이 아니므로 조용히 제외한다.
// 거르지 않으면 ".DS_Store 등은 지원 형식 아님" 토스트로 잡음이 생긴다.
function isHiddenFile(name: string): boolean {
  return name.startsWith('.') || name === 'Thumbs.db' || name === 'desktop.ini'
}

// 빈 세그먼트/현재·상위 경로 토큰 제거 + 깊이 제한.
function sanitizeSegments(segments: string[]): string[] {
  return segments
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '.' && s !== '..')
    .slice(0, MAX_DEPTH)
}

// <input webkitdirectory> 로 고른 파일들. 각 File.webkitRelativePath 가
// "Root/sub/song.mp3" 형태이므로 마지막(파일명)을 뺀 앞부분이 폴더 경로.
export function entriesFromInput(files: FileList | File[]): UploadEntry[] {
  return Array.from(files)
    .filter((file) => !isHiddenFile(file.name))
    .map((file) => {
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
      if (!rel) return { file, relPath: [] }
      const parts = rel.split('/')
      return { file, relPath: sanitizeSegments(parts.slice(0, -1)) }
    })
}

function readAllEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const out: FileSystemEntry[] = []
    const pump = () => {
      // readEntries 는 한 번에 최대 100개만 돌려주므로 빈 배열이 올 때까지 반복.
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(out)
          return
        }
        out.push(...batch)
        pump()
      }, reject)
    }
    pump()
  })
}

function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

async function walkEntry(
  entry: FileSystemEntry,
  prefix: string[],
  acc: UploadEntry[],
): Promise<void> {
  if (entry.isFile) {
    if (isHiddenFile(entry.name)) return
    const file = await fileFromEntry(entry as FileSystemFileEntry)
    acc.push({ file, relPath: prefix })
    return
  }
  if (entry.isDirectory && !isHiddenFile(entry.name) && prefix.length < MAX_DEPTH) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const children = await readAllEntries(reader)
    const nextPrefix = [...prefix, entry.name]
    for (const child of children) await walkEntry(child, nextPrefix, acc)
  }
}

// 드롭된 DataTransfer 에서 폴더 트리를 순회해 파일 목록을 만든다. entry API 가
// 없거나(구형) 항목에 entry 가 없으면 평면 파일 목록으로 폴백한다.
// webkitGetAsEntry 는 동기로 먼저 모두 수집해야 한다(핸들러 종료 후 items 무효화).
export async function entriesFromDataTransfer(
  dt: DataTransfer,
): Promise<UploadEntry[]> {
  const topEntries: FileSystemEntry[] = []
  for (const item of Array.from(dt.items)) {
    if (item.kind !== 'file') continue
    const entry = item.webkitGetAsEntry?.()
    if (entry) topEntries.push(entry)
  }

  if (topEntries.length === 0) {
    return Array.from(dt.files).map((file) => ({ file, relPath: [] }))
  }

  const acc: UploadEntry[] = []
  for (const entry of topEntries) await walkEntry(entry, [], acc)
  return acc
}
