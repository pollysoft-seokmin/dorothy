import enKoRaw from '~/assets/icons/language-en-ko.svg?raw'
import enRaw from '~/assets/icons/language-en.svg?raw'
import koRaw from '~/assets/icons/language-ko.svg?raw'
import exposeNoneRaw from '~/assets/icons/expose-none.svg?raw'
import exposeShortRaw from '~/assets/icons/expose-short.svg?raw'
import exposeAllRaw from '~/assets/icons/expose-all.svg?raw'

// 원본 SVG에 fill="#000000"이 박혀 있어 다크 배경에서 그대로 쓰면 묻힌다.
// CSS mask-image + data URL로 시도했더니 HTML entity escape를 거치는 SSR 경로에서
// 데이터 URL 일부 문자가 깨져 mask가 비활성화되고 결과적으로 단색 정사각형으로
// 표시되는 회귀가 있었다 (#62 리뷰).
//
// 안전한 길은 SVG 파일을 raw text로 import해 fill을 currentColor로 치환한 뒤
// inline DOM에 넣는 것 — 인코딩/MIME/escape가 모두 빠진다. dangerouslySetInnerHTML
// 의 입력은 빌드 시점에 정해진 자산 텍스트이므로 사용자 입력이 흐를 경로가 없다.
//
// 크기는 CSS(부모 span)가 결정 — SVG의 width/height 속성을 100% 로 바꿔
// viewBox 비율 유지한 채 wrapper의 size-* 토큰으로 16/20/24 어디든 자유롭게.
function patch(raw: string): string {
  return raw
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/fill="#000000"/g, 'fill="currentColor"')
    .replace(
      /<svg([^>]*?)width="\d+px"\s+height="\d+px"/,
      '<svg$1width="100%" height="100%"',
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
  'language-en-ko': patch(enKoRaw),
  'language-en': patch(enRaw),
  'language-ko': patch(koRaw),
  'expose-none': patch(exposeNoneRaw),
  'expose-short': patch(exposeShortRaw),
  'expose-all': patch(exposeAllRaw),
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
