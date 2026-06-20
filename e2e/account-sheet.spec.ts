import { test } from '@playwright/test'

test.describe.skip('Account sheet', () => {
  test('requires a Google OAuth session test double', async () => {
    // Google-only auth removed the email/password test setup path. Re-enable
    // this suite after adding an OAuth session fixture or auth-state seed.
  })
})
