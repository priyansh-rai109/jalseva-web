import { test, expect } from '@playwright/test'

test.describe('Flow 2: Supplier Registration & Login', () => {
  test('Supplier can register/login with role selection and reach supplier dashboard', async ({ page }) => {
    // 1. Navigate to register
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()

    // 2. Select Supplier Role
    const supplierRoleBtn = page.getByRole('button', { name: /Supplier/i })
    await supplierRoleBtn.click()

    // 3. Enter 10-digit supplier mobile number
    const phoneInput = page.locator('input[type="tel"]')
    await phoneInput.fill('9876543211')

    // 4. Click Get OTP
    const getOtpBtn = page.getByRole('button', { name: /Get OTP/i })
    await getOtpBtn.click()

    // 5. Fill OTP 123456
    await expect(page.getByText('Enter 6-digit OTP')).toBeVisible()
    const otpInputs = page.locator('input[inputmode="numeric"]')
    const otpDigits = ['1', '2', '3', '4', '5', '6']
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(otpDigits[i])
    }

    // 6. Click Verify & Continue
    const verifyBtn = page.getByRole('button', { name: /Verify & Continue/i })
    await verifyBtn.click()

    // 7. Expect redirect to Supplier Dashboard or complete-profile with supplier role
    await page.waitForURL(/\/(supplier\/dashboard|register\/complete-profile)/)
    expect(page.url()).toMatch(/\/(supplier\/dashboard|register\/complete-profile)/)
  })
})
