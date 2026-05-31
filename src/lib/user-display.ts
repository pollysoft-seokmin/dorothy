// 사용자 표시 이름 — 타이틀/계정에서 공유 (#114).
// name 이 있으면 그대로, 없으면 이메일 @ 앞부분을 CamelCase 로 변환해 표시한다.

// 구분자(. _ - 공백 등)로 나눠 각 조각의 첫 글자를 대문자로 만들고 붙인다.
// 예: "seokmin" → "Seokmin", "john.doe" → "JohnDoe", "jane_smith" → "JaneSmith".
function toCamelCase(raw: string): string {
  const parts = raw.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  if (parts.length === 0) return raw
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
}

export function displayName(user: {
  name?: string | null
  email?: string | null
}): string {
  const name = user.name?.trim()
  if (name) return name
  const prefix = (user.email ?? '').split('@')[0]
  return toCamelCase(prefix) || prefix
}

// 이니셜 아바타 색 — 이메일을 해싱해 24색 팔레트 중 하나를 항상 동일하게 고른다.
// 팔레트는 색상환을 24등분(15° 간격)한 hsl 로, 흰 글자와 대비되도록 진한 톤.
const AVATAR_COLOR_COUNT = 24

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function avatarColor(email: string): string {
  const index = hashString(email) % AVATAR_COLOR_COUNT
  const hue = index * (360 / AVATAR_COLOR_COUNT)
  return `hsl(${hue} 65% 40%)`
}
