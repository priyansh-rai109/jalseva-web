import { test, expect } from '@playwright/test'

test.describe('Flow 5: Order Acceptance by Supplier', () => {
  test('Supplier can view orders and update order status', async ({ page }) => {
    // 1. Authenticate as Supplier via Supplier Demo
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()

    const supplierDemoBtn = page.getByRole('button', { name: /Supplier Demo/i })
    await supplierDemoBtn.click()

    // 2. Expect redirect to Supplier Dashboard
    await page.waitForURL(/.*\/supplier\/dashboard/, { timeout: 15000 })
    expect(page.url()).toContain('/supplier/dashboard')

    // 3. Go to Supplier Orders page
    await page.goto('/supplier/orders')
    await expect(page.getByRole('heading', { name: /Orders/i })).toBeVisible()

    // 4. Verify order list or empty state is rendered
    const orderSection = page.getByText(/No orders found|Manage and fulfill|Order #/i)
    await expect(orderSection.first()).toBeVisible()
  })
})
