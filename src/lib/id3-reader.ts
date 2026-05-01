import type { TrackMetadata } from '~/types'

/**
 * MP3 파일에서 ID3v2 태그를 직접 파싱하여 TrackMetadata를 반환합니다.
 * 실패 시 null 반환 (조용히 실패).
 */
export async function readID3Tags(file: File): Promise<TrackMetadata | null> {
  try {
    // ID3v2 헤더는 처음 10바이트
    const headerBuf = await file.slice(0, 10).arrayBuffer()
    const header = new Uint8Array(headerBuf)

    // ID3v2 시그니처 확인: "ID3"
    if (header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) {
      return null
    }

    // ID3 태그 크기 (synchsafe integer)
    const size =
      ((header[6] & 0x7f) << 21) |
      ((header[7] & 0x7f) << 14) |
      ((header[8] & 0x7f) << 7) |
      (header[9] & 0x7f)

    // 전체 ID3 태그 읽기
    const tagBuf = await file.slice(0, 10 + size).arrayBuffer()
    const data = new Uint8Array(tagBuf)
    const version = header[3] // ID3v2.x

    let title: string | undefined
    let artist: string | undefined
    let album: string | undefined
    let albumArt: string | undefined

    let pos = 10

    // ID3v2.2 는 3바이트 프레임 ID, ID3v2.3/4 는 4바이트
    const frameIdLen = version === 2 ? 3 : 4
    const frameHeaderLen = version === 2 ? 6 : 10

    while (pos + frameHeaderLen < data.length) {
      const frameId =
        version === 2
          ? String.fromCharCode(data[pos], data[pos + 1], data[pos + 2])
          : String.fromCharCode(
              data[pos],
              data[pos + 1],
              data[pos + 2],
              data[pos + 3],
            )

      // 종료 조건: null 패딩
      if (frameId[0] === '\0') break

      let frameSize: number
      if (version === 2) {
        frameSize =
          (data[pos + 3] << 16) | (data[pos + 4] << 8) | data[pos + 5]
      } else if (version === 4) {
        // ID3v2.4: synchsafe integer
        frameSize =
          ((data[pos + 4] & 0x7f) << 21) |
          ((data[pos + 5] & 0x7f) << 14) |
          ((data[pos + 6] & 0x7f) << 7) |
          (data[pos + 7] & 0x7f)
      } else {
        // ID3v2.3: regular integer
        frameSize =
          (data[pos + 4] << 24) |
          (data[pos + 5] << 16) |
          (data[pos + 6] << 8) |
          data[pos + 7]
      }

      if (frameSize <= 0 || pos + frameHeaderLen + frameSize > data.length) break

      const frameData = data.slice(
        pos + frameHeaderLen,
        pos + frameHeaderLen + frameSize,
      )

      // 텍스트 프레임
      const titleIds = version === 2 ? ['TT2'] : ['TIT2']
      const artistIds = version === 2 ? ['TP1'] : ['TPE1']
      const albumIds = version === 2 ? ['TAL'] : ['TALB']
      const pictureIds = version === 2 ? ['PIC'] : ['APIC']

      if (titleIds.includes(frameId)) {
        title = decodeTextFrame(frameData)
      } else if (artistIds.includes(frameId)) {
        artist = decodeTextFrame(frameData)
      } else if (albumIds.includes(frameId)) {
        album = decodeTextFrame(frameData)
      } else if (pictureIds.includes(frameId)) {
        albumArt = decodePictureFrame(frameData, version)
      }

      pos += frameHeaderLen + frameSize
    }

    if (!title && !artist && !album && !albumArt) return null
    return { title, artist, album, albumArt }
  } catch {
    return null
  }
}

function decodeTextFrame(data: Uint8Array): string {
  const encoding = data[0]
  const textBytes = data.slice(1)

  if (encoding === 0) {
    // ISO-8859-1
    return Array.from(textBytes)
      .filter((b) => b !== 0)
      .map((b) => String.fromCharCode(b))
      .join('')
  } else if (encoding === 1 || encoding === 2) {
    // UTF-16 (with or without BOM)
    const decoder = new TextDecoder('utf-16')
    return decoder.decode(textBytes).replace(/\0/g, '')
  } else if (encoding === 3) {
    // UTF-8
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(textBytes).replace(/\0/g, '')
  }
  return ''
}

function decodePictureFrame(
  data: Uint8Array,
  version: number,
): string | undefined {
  try {
    let offset = 1 // skip encoding byte

    if (version === 2) {
      // PIC: encoding(1) + image format(3) + picture type(1) + description + picture data
      const format = String.fromCharCode(data[1], data[2], data[3])
      offset = 4 // encoding + 3-byte format
      offset++ // picture type
      // skip description (null-terminated)
      while (offset < data.length && data[offset] !== 0) offset++
      offset++ // skip null terminator
    } else {
      // APIC: encoding(1) + mime(null-terminated) + picture type(1) + description(null-terminated) + picture data
      // skip MIME type
      while (offset < data.length && data[offset] !== 0) offset++
      offset++ // null
      offset++ // picture type
      // skip description
      while (offset < data.length && data[offset] !== 0) offset++
      offset++ // null
    }

    if (offset >= data.length) return undefined

    const imageData = data.slice(offset)
    // Determine MIME type from magic bytes
    let mime = 'image/jpeg'
    if (imageData[0] === 0x89 && imageData[1] === 0x50) {
      mime = 'image/png'
    }

    let binary = ''
    for (let i = 0; i < imageData.length; i++) {
      binary += String.fromCharCode(imageData[i])
    }
    return `data:${mime};base64,${btoa(binary)}`
  } catch {
    return undefined
  }
}
