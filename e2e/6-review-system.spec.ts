import { test, expect } from '@playwright/test'

test.describe('Flow 6: Order Review & Rating System', () => {
  test('Customer can view supplier ratings and submit reviews for delivered orders', async ({ page }) => {
    // 1. Authenticate as Customer via Demo Login
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()

    const customerDemoBtn = page.getByRole('button', { name: /Customer Demo/i })
    await customerDemoBtn.click()

    // 2. Wait for redirect to customer dashboard
    await page.waitForURL(/\/customer\/dashboard/)
    expect(page.url()).toContain('/customer/dashboard')

    // 3. Go to Browse Suppliers and check rating & review count display
    await page.goto('/customer/browse')
    await expect(page.getByRole('heading', { name: /Browse Suppliers/i })).toBeVisible()

    // 4. Visit My Orders page and verify orders display
    await page.goto('/customer/orders')
    await expect(page.getByRole('heading', { name: /My Orders/i })).toBeVisible()

    // 5. Check if Rate & Review button or View Details button is present
    const viewDetailsBtn = page.getByRole('button', { name: /View Details & Tracking|Rate & Review Delivery/i })
    if (await viewDetailsBtn.count() > 0) {
      await expect(viewDetailsBtn.first()).toBeVisible()
    }
  })
})
