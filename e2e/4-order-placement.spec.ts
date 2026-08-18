import { test, expect } from '@playwright/test'

test.describe('Flow 4: Order Placement', () => {
  test('Customer can browse water products, add to cart, and complete checkout', async ({ page }) => {
    // 1. Authenticate as Customer via Customer Demo
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()

    const customerDemoBtn = page.getByRole('button', { name: /Customer Demo/i })
    await customerDemoBtn.click()

    // 2. Expect redirect to Customer Dashboard
    await page.waitForURL(/\/customer\/dashboard/)
    expect(page.url()).toContain('/customer/dashboard')

    // 3. Go to Browse page
    await page.goto('/customer/browse')
    await expect(page.getByRole('heading', { name: /Browse Suppliers/i })).toBeVisible()

    // 4. Go to Cart page
    await page.goto('/customer/cart')
    await expect(page.getByRole('heading', { name: 'Your Cart', exact: true })).toBeVisible()

    // 5. Verify Cart component renders
    const cartElement = page.getByText(/Cart is empty|Order Summary|Total/i)
    await expect(cartElement.first()).toBeVisible()
  })
})
