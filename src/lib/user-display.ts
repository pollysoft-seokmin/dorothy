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
