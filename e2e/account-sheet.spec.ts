import { expect, test } from '@playwright/test'

// 모바일 viewport — iPhone 14 사이즈. AccountSheet 가 lg:hidden 으로 모바일
// 폭(<1024px)에서만 마운트되므로 데스크톱 기본 viewport 그대로면 트리거 자체가
// 보이지 않는다.
const MOBILE_VIEWPORT = { width: 375, height: 812 }

// 충돌 회피용 유니크 이메일. signup 폼은 better-auth 의 email/password 흐름이라
// 동일 이메일이면 두 번째 부터 실패한다 — 매 테스트 fresh 사용자.
function uniqueEmail(): string {
  return `e2e-sheet-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

// UI signup 폼은 hydration race로 두 번째 이후 click이 폼 핸들러가 부착되기
// 전에 발화하는 flake가 있다(dev 서버 lazy chunk). 테스트 셋업에선 API를
// 직접 때려 세션 쿠키를 받고, 그 컨텍스트로 / 에 진입하는 게 안정적.
async function signUpAndLand(page: import('@playwright/test').Page) {
  const email = uniqueEmail()
  const password = 'testpass123'
  const res = await page.request.post('/api/auth/sign-up/email', {
    data: { email, password, name: 'e2e' },
    headers: { Origin: 'http://localhost:3000' },
  })
  if (!res.ok()) {
    throw new Error(`sign-up failed: ${res.status()} ${await res.text()}`)
  }
  await page.goto('/')
  return { email, password }
}

test.describe('Mobile account bottom sheet (#63)', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test('헤더 아바타 탭 → 시트 열림, X 로 닫힘', async ({ page }) => {
    const { email } = await signUpAndLand(page)

    // 헤더의 모바일 아바타 트리거 — aria-label 에 이메일이 들어간다.
    const avatar = page.getByRole('button', { name: `내 계정 (${email})` })
    await expect(avatar).toBeVisible()
    await avatar.click()

    const sheet = page.getByRole('dialog', { name: '내 계정' })
    await expect(sheet).toBeVisible()
    // 시트 안에 이메일이 노출돼야 한다.
    await expect(sheet.getByText(email)).toBeVisible()

    // 열린 동안 body 스크롤이 잠겨 있어야 함 (matchMedia 가드라 모바일에서만).
    await expect
      .poll(async () => page.evaluate(() => document.body.style.overflow))
      .toBe('hidden')

    // 시트 헤더의 X(닫기) — backdrop 의 '닫기' 와 두 번 매치되므로 dialog 안에서 검색.
    await sheet.getByRole('button', { name: '닫기' }).click()
    await expect(sheet).toBeHidden()
    await expect
      .poll(async () => page.evaluate(() => document.body.style.overflow))
      .not.toBe('hidden')
  })

  test('ESC 로 시트 닫힘', async ({ page }) => {
    const { email } = await signUpAndLand(page)
    await page.getByRole('button', { name: `내 계정 (${email})` }).click()
    const sheet = page.getByRole('dialog', { name: '내 계정' })
    await expect(sheet).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  })

  test('백드롭 탭으로 시트 닫힘', async ({ page }) => {
    const { email } = await signUpAndLand(page)
    await page.getByRole('button', { name: `내 계정 (${email})` }).click()
    const sheet = page.getByRole('dialog', { name: '내 계정' })
    await expect(sheet).toBeVisible()

    // 시트는 max-h-[88vh] 로 하단 정렬. 상단 12vh+ 영역은 backdrop이다.
    // 시트 boundingBox 의 top - 40px 지점을 탭한다.
    const box = await sheet.boundingBox()
    if (!box) throw new Error('sheet bounding box unavailable')
    await page.mouse.click(box.x + box.width / 2, Math.max(10, box.y - 40))
    await expect(sheet).toBeHidden()
  })
})

test.describe('Desktop /account 경로 (회귀 가드)', () => {
  // 데스크톱 폭에선 시트가 lg:hidden 으로 마운트되지 않고, 헤더의 /account
  // 링크가 그대로 동작해야 한다. 트리거(아바타 버튼)도 lg:hidden 이라 안보임.
  test.use({ viewport: { width: 1280, height: 800 } })

  test('데스크톱에선 모바일 아바타 트리거가 숨김', async ({ page }) => {
    const { email } = await signUpAndLand(page)
    // 모바일 트리거는 보이면 안 됨
    await expect(
      page.getByRole('button', { name: `내 계정 (${email})` }),
    ).toBeHidden()
    // 데스크톱 /account 링크는 보여야 함
    await expect(page.getByRole('link', { name: new RegExp(email) })).toBeVisible()
  })
})
