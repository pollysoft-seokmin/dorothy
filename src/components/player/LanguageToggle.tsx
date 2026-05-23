import { Button } from '~/components/ui/button'
import { MaskedIcon, type MaskedIconName } from './MaskedIcon'
import type { LyricsLanguage } from '~/stores/player-store'

interface LanguageToggleProps {
  language: LyricsLanguage
  disabled?: boolean
  onCycle: () => void
}

const ICON_BY_LANGUAGE: Record<LyricsLanguage, MaskedIconName> = {
  'en-ko': 'language-en-ko',
  en: 'language-en',
  ko: 'language-ko',
}

const LABEL_BY_LANGUAGE: Record<LyricsLanguage, string> = {
  'en-ko': '영어/한글 모두',
  en: '영어만',
  ko: '한글만',
}

export function LanguageToggle({
  language,
  disabled = false,
  onCycle,
}: LanguageToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onCycle}
      disabled={disabled}
      aria-label={`가사 언어: ${LABEL_BY_LANGUAGE[language]} (클릭하여 변경)`}
      // 아이콘 16x16 (Button 기본 [&_svg]:size-4 유지). 평시에는 배경 투명 +
      // primary(그린) 아이콘이고, hover 시 화이트 10% 둥근 하이라이트로 버튼
      // 영역을 인지시킨다 (다크 배경에서 아이콘만 떠 있으면 클릭 가능성을
      // 알기 어려운 회귀 보완). 아이콘 자체는 primary-bright 로 살짝 밝아짐.
      className="size-9 shrink-0 rounded-full bg-transparent text-primary hover:bg-white/10 hover:text-primary-bright"
    >
      <MaskedIcon name={ICON_BY_LANGUAGE[language]} className="flex size-4 shrink-0" />
    </Button>
  )
}
