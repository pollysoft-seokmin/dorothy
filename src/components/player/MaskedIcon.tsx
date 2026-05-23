import enKoRaw from '~/assets/icons/language-en-ko.svg?raw'
import enRaw from '~/assets/icons/language-en.svg?raw'
import koRaw from '~/assets/icons/language-ko.svg?raw'
import exposeNoneRaw from '~/assets/icons/expose-none.svg?raw'
import exposeShortRaw from '~/assets/icons/expose-short.svg?raw'
import exposeAllRaw from '~/assets/icons/expose-all.svg?raw'

// 원본 SVG에 fill="#000000"이 박혀 있어 다크 배경에서 그대로 쓰면 묻힌다.
// CSS mask-image + data URL로 시도했더니 HTML entity escape를 거치는 SSR 경로에서
// 데이터 URL 일부 문자가 깨져 mask가 비활성화되고 결과적으로 24x24 정사각형
// 단색으로 표시되는 회귀가 있었다 (#62 리뷰).
//
// 안전한 길은 SVG 파일을 raw text로 import해 fill을 currentColor로 치환한 뒤
// inline DOM에 넣는 것 — 인코딩/MIME/escape가 모두 빠진다. dangerouslySetInnerHTML
// 의 입력은 빌드 시점에 정해진 자산 텍스트이므로 사용자 입력이 흐를 경로가 없다.
function patch(raw: string, sizePx: number): string {
  return raw
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/fill="#000000"/g, 'fill="currentColor"')
    .replace(
      /<svg([^>]*?)width="\d+px"\s+height="\d+px"/,
      `<svg$1width="${sizePx}" height="${sizePx}"`,
    )
}

export type MaskedIconName =
  | 'language-en-ko'
  | 'language-en'
  | 'language-ko'
  | 'expose-none'
  | 'expose-short'
  | 'expose-all'

// 빌드 시점에 한 번만 transform — 매 렌더에서 문자열 치환을 반복하지 않는다.
const CACHE: Record<MaskedIconName, string> = {
  'language-en-ko': patch(enKoRaw, 24),
  'language-en': patch(enRaw, 24),
  'language-ko': patch(koRaw, 24),
  'expose-none': patch(exposeNoneRaw, 24),
  'expose-short': patch(exposeShortRaw, 24),
  'expose-all': patch(exposeAllRaw, 24),
}

interface MaskedIconProps {
  name: MaskedIconName
  className?: string
}

export function MaskedIcon({ name, className }: MaskedIconProps) {
  return (
    <span
      aria-hidden
      className={className}
      // SVG 자산은 빌드 입력이므로 사용자 입력이 흐를 경로 없음.
      dangerouslySetInnerHTML={{ __html: CACHE[name] }}
    />
  )
}
