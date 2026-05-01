/**
 * 브라우저에서 비호환 비디오 포맷(.mpg/.mpeg)을 ffmpeg.wasm으로
 * H.264/AAC MP4로 트랜스코딩한다.
 *
 * - ffmpeg.wasm 코어(~25MB)는 lazy import + CDN(unpkg)에서 한 번만 로드되며
 *   같은 세션에서 재사용된다.
 * - 단일 스레드 코어를 사용하므로 SharedArrayBuffer/COOP·COEP 헤더 불필요.
 */

import type { FFmpeg } from '@ffmpeg/ffmpeg'

const CORE_VERSION = '0.12.6'
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`

let ffmpegPromise: Promise<FFmpeg> | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise
  ffmpegPromise = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import('@ffmpeg/ffmpeg'),
      import('@ffmpeg/util'),
    ])
    const ffmpeg = new FFmpeg()
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
      toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    ])
    await ffmpeg.load({ coreURL, wasmURL })
    return ffmpeg
  })()
  // 로드 실패 시 다음 호출에서 재시도할 수 있게 promise를 비운다
  ffmpegPromise.catch(() => {
    ffmpegPromise = null
  })
  return ffmpegPromise
}

export interface TranscodeProgress {
  /** 0.0 ~ 1.0 */
  ratio: number
}

/**
 * .mpg/.mpeg 파일을 H.264/AAC MP4로 트랜스코딩한다.
 * 결과는 기존 비디오 처리 파이프라인(<video>, useMediaPlayer)에서
 * 그대로 사용 가능한 File이다 (확장자 .mp4, MIME video/mp4).
 *
 * `preset=ultrafast`로 변환 속도를 우선하며, 화질은 재생용으로 충분.
 */
export async function transcodeMpgToMp4(
  file: File,
  onProgress?: (p: TranscodeProgress) => void,
): Promise<File> {
  const ffmpeg = await getFFmpeg()
  const { fetchFile } = await import('@ffmpeg/util')

  const inputName = 'input.mpg'
  const outputName = 'output.mp4'

  const handleProgress = ({ progress }: { progress: number }) => {
    // ffmpeg는 가끔 1.0 을 넘는 값을 내보내거나 음수를 내보낼 수 있어 클램프
    const ratio = Math.max(0, Math.min(1, progress))
    onProgress?.({ ratio })
  }
  ffmpeg.on('progress', handleProgress)

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))
    const exitCode = await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ])
    if (exitCode !== 0) {
      throw new Error(`ffmpeg exited with code ${exitCode}`)
    }
    const data = (await ffmpeg.readFile(outputName)) as Uint8Array
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' })
    const newName = file.name.replace(/\.(mpg|mpeg)$/i, '.mp4')
    return new File([blob], newName, { type: 'video/mp4' })
  } finally {
    ffmpeg.off('progress', handleProgress)
    // FFmpeg 가상 파일시스템 정리 (실패 시 무시)
    await ffmpeg.deleteFile(inputName).catch(() => {})
    await ffmpeg.deleteFile(outputName).catch(() => {})
  }
}
