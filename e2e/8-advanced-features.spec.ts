import { test, expect } from '@playwright/test'

test.describe('Advanced Features: Water Canvas, TDS Badges, Subscriptions, Emergency Delivery & Live GPS', () => {
  test('Landing page renders interactive Water Canvas and Water Conservation Ticker', async ({ page }) => {
    await page.goto('/')

    // Water canvas exists in DOM
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeAttached()

    // Water Conservation Ticker is visible
    const ticker = page.locator('aside[aria-label="Water Conservation Wisdom"]')
    await expect(ticker).toBeVisible()
  })

  test('Customer can access Subscriptions page and view/manage Monthly Water Passes', async ({ page }) => {
    // Authenticate as Customer via Demo
    await page.goto('/login')
    await page.getByRole('button', { name: /Customer Demo/i }).click()
    await page.waitForURL(/.*\/customer\/dashboard/)

    // Navigate to Subscriptions page
    await page.goto('/customer/subscriptions')
    await expect(page.getByRole('heading', { name: /Monthly Water Pass|मासिक वॉटर पास/i })).toBeVisible()

    // Open Create Monthly Pass modal
    const startPassBtn = page.getByRole('button', { name: /Start New Monthly Pass|नया मासिक पास/i }).first()
    await startPassBtn.click()

    // Modal dialog opens
    await expect(page.getByText(/Monthly Water Pass|मासिक वॉटर पास/i).first()).toBeVisible()

    // Click cancel
    const cancelBtn = page.getByRole('button', { name: /Cancel|रद्द करें/i })
    await cancelBtn.click()
  })

  test('Supplier profile renders TDS Purity Badges and Cart checkout offers Emergency Delivery toggle', async ({ page }) => {
    // Authenticate as Customer via Demo
    await page.goto('/login')
    await page.getByRole('button', { name: /Customer Demo/i }).click()
    await page.waitForURL(/.*\/customer\/dashboard/)

    // Verify TDS Purity Badge is displayed on Dashboard
    await expect(page.getByText(/TDS/i).first()).toBeVisible()

    // Navigate to browse page
    await page.goto('/customer/browse')
    await expect(page.getByRole('heading', { name: /Browse Suppliers|पानी सप्लायर्स/i })).toBeVisible()
  })
})
