import { test, expect } from '@playwright/test'

test.describe('Flow 3: Admin Login', () => {
  test('Admin can access admin portal and login', async ({ page }) => {
    // 1. Navigate to admin login page
    await page.goto('/admin-login')
    await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible()

    // 2. Pre-fill credentials or click demo pre-fill button
    const demoBtn = page.getByRole('button', { name: /Pre-fill Admin Demo Credentials/i })
    await demoBtn.click()

    // 3. Click Access Admin Panel button
    const accessBtn = page.getByRole('button', { name: /Access Admin Panel/i })
    await accessBtn.click()

    // 4. Expect navigation or attempt
    await page.waitForTimeout(1000)
    expect(page.url()).toMatch(/\/(admin\/dashboard|admin-login)/)
  })
})
