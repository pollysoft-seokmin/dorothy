/**
 * 캐시된(트랜스코딩된) 비디오에서 썸네일 프레임을 뽑는다.
 *
 * - 요구사항: "전체 길이의 초기 10% 구간"에서 한 프레임을 캡처한다.
 * - 대상은 IndexedDB transcode-cache 에 있는 영상뿐이다(이미 로컬에 받아둔 것만).
 *   원본을 새로 내려받지 않으므로 목록을 여는 것만으로 네트워크/용량을 쓰지 않는다.
 * - 추출 실패(코덱/시킹 불가 등)는 null 을 반환해 호출부가 비디오 아이콘으로
 *   폴백하게 한다.
 */

import { getCachedTranscode } from './transcode-cache'
import { getCachedThumbnail, putCachedThumbnail } from './thumbnail-cache'

const THUMB_FRACTION = 0.1 // 전체 길이의 10% 지점
const THUMB_MAX_WIDTH = 160 // 목록 타일은 작아 160px 폭이면 충분
const LOAD_TIMEOUT_MS = 10_000

function onceEvent(
  el: HTMLMediaElement,
  event: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      el.removeEventListener(event, onOk)
      el.removeEventListener('error', onErr)
      clearTimeout(timer)
    }
    const onOk = () => {
      cleanup()
      resolve()
    }
    const onErr = () => {
      cleanup()
      reject(new Error('media error'))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('media timeout'))
    }, timeoutMs)
    el.addEventListener(event, onOk, { once: true })
    el.addEventListener('error', onErr, { once: true })
  })
}

/**
 * Blob(비디오)에서 fraction 지점의 프레임을 캡처해 WebP Blob 으로 반환한다.
 * 브라우저(document) 가 없거나 실패하면 null.
 */
export async function extractVideoThumbnail(
  blob: Blob,
  { fraction = THUMB_FRACTION, maxWidth = THUMB_MAX_WIDTH }: {
    fraction?: number
    maxWidth?: number
  } = {},
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  try {
    video.muted = true
    video.preload = 'auto'
    video.playsInline = true
    video.src = url

    await onceEvent(video, 'loadedmetadata', LOAD_TIMEOUT_MS)
    const duration = video.duration
    const known = Number.isFinite(duration) && duration > 0
    // 길이를 알면 10% 지점, 모르면 0 이면 'seeked' 가 안 뜰 수 있어 작은 값으로
    // 강제 시킹. 길이를 알 때는 끝을 살짝 넘지 않도록 클램프.
    let target = known ? duration * fraction : 0.1
    if (known) target = Math.min(target, Math.max(0, duration - 0.05))

    const seeked = onceEvent(video, 'seeked', LOAD_TIMEOUT_MS)
    video.currentTime = target
    await seeked

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return null

    const scale = Math.min(1, maxWidth / vw)
    const w = Math.max(1, Math.round(vw * scale))
    const h = Math.max(1, Math.round(vh * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.8),
    )
  } catch {
    return null
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

/**
 * 변환 직후처럼 이미 Blob 을 들고 있을 때, 썸네일을 미리 추출해 캐시에 넣는다.
 * 이미 캐시돼 있으면 건너뛴다. 목록을 열기 전에 미리 준비(prewarm)하는 용도라
 * 실패는 조용히 무시한다(다음에 목록에서 lazy 로 재시도됨).
 */
export async function cacheVideoThumbnail(
  fileId: string,
  blob: Blob,
): Promise<void> {
  if (!fileId) return
  try {
    if (await getCachedThumbnail(fileId)) return
    const thumb = await extractVideoThumbnail(blob)
    if (thumb) await putCachedThumbnail(fileId, thumb)
  } catch {
    // 무시 — prewarm 은 최적화일 뿐
  }
}

/**
 * fileId 에 해당하는 썸네일을 반환한다.
 * 1) 썸네일 캐시 hit → 그대로 반환
 * 2) transcode-cache 에 영상이 있으면 프레임 추출 후 캐시에 저장하고 반환
 * 3) 캐시된 영상이 없거나 추출 실패 → null (호출부는 아이콘 폴백)
 */
export async function getOrCreateVideoThumbnail(
  fileId: string,
): Promise<Blob | null> {
  if (!fileId) return null
  const cached = await getCachedThumbnail(fileId)
  if (cached) return cached

  const cachedVideo = await getCachedTranscode(fileId)
  if (!cachedVideo) return null

  const thumb = await extractVideoThumbnail(cachedVideo)
  if (thumb) void putCachedThumbnail(fileId, thumb).catch(() => {})
  return thumb
}
