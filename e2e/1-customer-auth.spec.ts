import { test, expect } from '@playwright/test'

test.describe('Flow 1: Customer Registration & Login', () => {
  test('Customer can authenticate via OTP and reach customer dashboard', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('/login')
    await expect(page).toHaveTitle(/JalSeva/)
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()

    // 2. Enter 10-digit mobile number
    const phoneInput = page.locator('input[type="tel"]')
    await phoneInput.fill('9876543210')

    // 3. Click Send OTP
    const sendOtpBtn = page.getByRole('button', { name: /Send OTP/i })
    await sendOtpBtn.click()

    // 4. Expect OTP input screen
    await expect(page.getByText('Enter 6-digit OTP')).toBeVisible()

    // 5. Fill test OTP 123456
    const otpInputs = page.locator('input[inputmode="numeric"]')
    const otpDigits = ['1', '2', '3', '4', '5', '6']
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(otpDigits[i])
    }

    // 6. Click Verify & Continue
    const verifyBtn = page.getByRole('button', { name: /Verify & Continue/i })
    await verifyBtn.click()

    // 7. Expect successful redirect to Customer Dashboard
    await page.waitForURL(/\/(customer\/dashboard|register\/complete-profile)/)
    expect(page.url()).toMatch(/\/(customer\/dashboard|register\/complete-profile)/)
  })
})
