import { test, expect } from '@playwright/test'

test.describe('Flow 2: Supplier Registration & Login', () => {
  test('Supplier can register/login with role selection and reach supplier dashboard', async ({ page }) => {
    // 1. Navigate to register
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /Create an Account|खाता बनाएं/i })).toBeVisible()

    // 2. Select Supplier Role
    const supplierRoleBtn = page.getByRole('button', { name: /Water Supplier|सप्लायर/i })
    await supplierRoleBtn.click()

    // 3. Fill Supplier Name & Phone & 4-Digit PIN
    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.fill('Marwar RO Water')

    const phoneInput = page.locator('input[type="tel"]')
    await phoneInput.fill('9829099887')

    const pinInputs = page.locator('input[type="password"]')
    await pinInputs.nth(0).fill('4582')
    await pinInputs.nth(1).fill('4582')

    // 4. Click Submit
    const submitBtn = page.getByRole('button', { name: /Create Account|अकाउंट बनाएं/i })
    await submitBtn.click()

    // 5. Expect redirect to Supplier Dashboard
    await page.waitForURL(/.*\/supplier\/dashboard/, { timeout: 15000 })
    expect(page.url()).toContain('/supplier/dashboard')
  })
})
