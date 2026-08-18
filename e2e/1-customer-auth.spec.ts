import { test, expect } from '@playwright/test'

test.describe('Flow 1: Customer Registration & Login', () => {
  test('Customer can authenticate via OTP and reach customer dashboard', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('/login')
    await expect(page).toHaveTitle(/JalSeva/)
    await expect(page.getByRole('heading', { name: /Welcome Back|वापसी पर स्वागत/i })).toBeVisible()

    // 2. Pre-fill customer demo session
    const customerDemoBtn = page.getByRole('button', { name: /Customer Demo/i })
    if (await customerDemoBtn.isVisible()) {
      await customerDemoBtn.click()
    } else {
      const phoneInput = page.locator('input[type="tel"]')
      await phoneInput.fill('9876543210')
      const sendOtpBtn = page.getByRole('button', { name: /Send OTP|ओटीपी भेजें/i })
      await sendOtpBtn.click()
    }

    // 3. Expect successful redirect to Customer Dashboard
    await page.waitForURL(/\/(customer\/dashboard|register\/complete-profile)/, { timeout: 15000 })
    expect(page.url()).toMatch(/\/(customer\/dashboard|register\/complete-profile)/)
  })
})
