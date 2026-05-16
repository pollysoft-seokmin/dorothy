import { Button } from '~/components/ui/button'
import type { LyricsLanguage } from '~/stores/player-store'
import enKoIcon from '~/assets/icons/language-en-ko.svg'
import enIcon from '~/assets/icons/language-en.svg'
import koIcon from '~/assets/icons/language-ko.svg'

interface LanguageToggleProps {
  language: LyricsLanguage
  disabled?: boolean
  onCycle: () => void
}

const ICON_BY_LANGUAGE: Record<LyricsLanguage, string> = {
  'en-ko': enKoIcon,
  en: enIcon,
  ko: koIcon,
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
      className="shrink-0"
    >
      <img
        src={ICON_BY_LANGUAGE[language]}
        alt=""
        aria-hidden="true"
        className="h-4 w-4"
      />
    </Button>
  )
}
