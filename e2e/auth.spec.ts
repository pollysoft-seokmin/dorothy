import { expect, test } from '@playwright/test'

test.describe('Auth UI', () => {
  test('login page renders email + Google buttons', async ({ page }) => {
    await page.goto('/login')
    await expect(
      page.getByRole('heading', { name: '로그인' }),
    ).toBeVisible()
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
    await expect(
      page.getByRole('button', { name: '로그인', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Google로 계속하기' }),
    ).toBeVisible()
  })

  test('signup page renders form', async ({ page }) => {
    await page.goto('/signup')
    await expect(
      page.getByRole('heading', { name: '회원가입' }),
    ).toBeVisible()
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
    await expect(
      page.getByRole('button', { name: '가입하기' }),
    ).toBeVisible()
  })

  test('header shows login button when signed out', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('link', { name: /로그인/ }),
    ).toBeVisible()
  })

  test('account redirects to login when signed out', async ({ page }) => {
    await page.goto('/account')
    await expect(page).toHaveURL(/\/login$/)
  })
})
