// Polly-format SAMI subtitle trailer extractor.
//
// Trailer layout (last 18 + N bytes of the media file):
//   [ ciphertext (N bytes) | scriptLength (8B LE) | publisherTag (10B ASCII) ]
//
// publisherTag selects the Blowfish key:
//   "singlepubl" -> "singlepc"
//   "publmobile" -> "parkmobi"
//
// The 8-byte length field is written big-endian on disk by the original Polly
// writer but reinterpreted via byte-swap before use, so on the wire it reads
// back as a little-endian uint64. We treat it as LE here.
//
// See polly/docs/SUBTITLE_FILE_SPEC.md for full reference.

import { blowfishDecryptECB } from './blowfish'
import type { LyricLine, ParsedLyrics } from '~/types'

const PUB_TAG_SIZE = 10
const SCRIPT_LEN_SIZE = 8
const TRAILER_META_SIZE = PUB_TAG_SIZE + SCRIPT_LEN_SIZE

const PUB_PC = 'singlepubl'
const PUB_MOBILE = 'publmobile'

const KEY_PC = 'singlepc'
const KEY_MOBILE = 'parkmobi'

interface SamiBlock {
  start: number // ms
  end: number // ms
  en: string
  ko: string
}

const ASCII = new TextDecoder('ascii')
const EUC_KR = new TextDecoder('euc-kr', { fatal: false })

function pickKey(tag: string): string | null {
  if (tag === PUB_PC) return KEY_PC
  if (tag === PUB_MOBILE) return KEY_MOBILE
  return null
}

/**
 * Best-effort extraction of an embedded SAMI subtitle trailer.
 * Returns parsed dorothy-compatible lyrics, or null if the file has no
 * recognizable trailer (or the trailer is malformed).
 */
export async function extractEmbeddedSami(
  file: File,
): Promise<ParsedLyrics | null> {
  if (file.size < TRAILER_META_SIZE) return null

  // Read the 18-byte fixed-size trailer footer (length + publisher tag).
  const footerBuf = await file
    .slice(file.size - TRAILER_META_SIZE)
    .arrayBuffer()
  const footer = new Uint8Array(footerBuf)
  const tag = ASCII.decode(footer.subarray(SCRIPT_LEN_SIZE, TRAILER_META_SIZE))
  const key = pickKey(tag)
  if (!key) return null

  // dataSize (LE u64). Real-world files often store an unaligned plaintext
  // byte count here (e.g. 4366 = 545*8 + 6) — Polly's reader rounds up to the
  // next 8-byte multiple before decrypting, so we mirror that. The last block
  // may then decrypt to garbage; the SAMI parser ignores anything past
  // </SAMI>/</BODY>.
  const lenView = new DataView(footer.buffer, footer.byteOffset, SCRIPT_LEN_SIZE)
  const lo = lenView.getUint32(0, true)
  const hi = lenView.getUint32(4, true)
  if (hi !== 0) return null
  const dataSize = lo
  if (dataSize <= 0) return null
  if (dataSize > file.size - TRAILER_META_SIZE) return null

  // Ciphertext block — start at size - 18 - dataSize, length rounded up to 8.
  const chunkSize = (dataSize + 7) & ~7
  const cipherStart = file.size - TRAILER_META_SIZE - dataSize
  if (cipherStart + chunkSize > file.size) return null
  const cipherBuf = await file
    .slice(cipherStart, cipherStart + chunkSize)
    .arrayBuffer()
  const ciphertext = new Uint8Array(cipherBuf)

  let plain: Uint8Array
  try {
    plain = blowfishDecryptECB(new TextEncoder().encode(key), ciphertext)
  } catch {
    return null
  }

  const samiText = EUC_KR.decode(plain)
  // Cheap sanity check — a real SAMI body always contains <SYNC tags.
  if (!/<SYNC\s/i.test(samiText)) return null

  const blocks = parseSami(samiText)
  if (blocks.length === 0) return null

  return blocksToLyrics(blocks)
}

/**
 * Port of Polly's SamiParser.parse() — consumes a SAMI document and produces
 * one block per (start, end) pair, merging matching English/Korean entries.
 */
export function parseSami(text: string): SamiBlock[] {
  const lines = text.split(/\r\n|\r|\n/)
  const n = lines.length
  let i = 0

  // Skip header until <BODY>.
  while (i < n) {
    const line = lines[i]
    i++
    if (line && line.startsWith('<BODY>')) break
  }

  const blocks: SamiBlock[] = []
  let language: 'en' | 'ko' | 'unknown' = 'unknown'
  const SYNC_RE = /Start=(\d+)/

  while (i < n) {
    const line = lines[i]
    if (line == null) break
    if (line.startsWith('</SAMI>') || line.startsWith('</BODY>')) break

    if (line.startsWith('<!-- 영어 자막 -->')) {
      language = 'en'
      i++
      continue
    }
    if (line.startsWith('<!-- 한글 자막 -->')) {
      language = 'ko'
      i++
      continue
    }

    // parseEach: consume one (start, paragraph..., end) tuple.
    let start = -1
    let end = -1
    let paragraph = ''
    let cur: string | undefined = line

    while (cur != null) {
      if (cur.startsWith('<SYNC')) {
        const m = SYNC_RE.exec(cur)
        if (m) {
          const t = parseInt(m[1], 10)
          if (cur.endsWith('&nbsp;')) {
            end = t
            i++ // consume the end-sync line
            break
          }
          start = t
        }
      } else {
        // Body line — strip wrapping <P Class=...> and decode entities.
        const cleaned = cleanParagraph(cur)
        if (cleaned) {
          paragraph = paragraph ? paragraph + '\n' + cleaned : cleaned
        }
      }
      i++
      cur = i < n ? lines[i] : undefined
    }

    if (start === -1 || end === -1) continue

    const existing = blocks.find((b) => b.start === start && b.end === end)
    const target = existing ?? { start, end, en: '', ko: '' }
    if (language === 'en') target.en = paragraph
    else if (language === 'ko') target.ko = paragraph
    if (!existing) blocks.push(target)
  }

  // Chronological order — Korean-only blocks may have been appended late.
  blocks.sort((a, b) => a.start - b.start)

  // Polly's normalization: clamp end to next.start - 1ms when overlapping.
  for (let k = 0; k < blocks.length - 1; k++) {
    if (blocks[k].end > blocks[k + 1].start) {
      blocks[k].end = blocks[k + 1].start - 1
    }
  }

  return blocks
}

const P_TAG_RE = /^<P\b[^>]*>/i
const ENTITY_RE = /&(nbsp|amp|lt|gt|quot|#39|apos);/gi
const ENTITY_MAP: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
}

function cleanParagraph(raw: string): string {
  return raw
    .replace(P_TAG_RE, '')
    .replace(ENTITY_RE, (_, name: string) => ENTITY_MAP[name.toLowerCase()] ?? '')
    .trim()
}

function blocksToLyrics(blocks: SamiBlock[]): ParsedLyrics {
  const lines: LyricLine[] = []
  for (const b of blocks) {
    const text = composeText(b.en, b.ko)
    if (!text) continue
    lines.push({ time: b.start / 1000, text })
  }
  // composeText preserves order; outer blocks list is already sorted.
  return { lines }
}

function composeText(en: string, ko: string): string {
  if (en && ko) {
    // 일부 콘텐츠는 EN 섹션과 KO 섹션에 동일한 본문(보통 한글 번역)을
    // 그대로 복제해 둔다. 그런 경우 두 줄로 보여주면 중복이라 한 줄만 노출.
    if (normalizeForCompare(en) === normalizeForCompare(ko)) return ko
    return `${en}\n${ko}`
  }
  return en || ko
}

function normalizeForCompare(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}
