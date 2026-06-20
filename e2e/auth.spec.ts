import { expect, test } from '@playwright/test'

test.describe('Auth UI', () => {
  test('login page renders Google-only sign-in', async ({ page }) => {
    await page.goto('/login')
    await expect(
      page.getByRole('heading', { name: '로그인' }),
    ).toBeVisible()
    await expect(page.getByLabel('이메일')).toHaveCount(0)
    await expect(page.getByLabel('비밀번호')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '로그인', exact: true }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Google로 계속하기' }),
    ).toBeVisible()
  })

  test('signup route is removed', async ({ page }) => {
    await page.goto('/signup')
    await expect(
      page.getByRole('heading', { name: '회원가입' }),
    ).toHaveCount(0)
  })

  test('header shows login button when signed out', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('link', { name: /로그인/ }),
    ).toBeVisible()
  })
})
