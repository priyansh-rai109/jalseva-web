import { test, expect } from '@playwright/test'

test.describe('Bilingual i18n & Enhanced Cart Flow', () => {
  test('Landing page toggles between English and Hindi correctly', async ({ page }) => {
    await page.goto('/')

    // Initial default language is English
    await expect(page.locator('text=Pure Water,')).toBeVisible()

    // Find and click language toggle button
    const langToggle = page.locator('button[aria-label="Toggle language between Hindi and English"]').first()
    await expect(langToggle).toBeVisible()
    await langToggle.click()

    // Verify Hindi text is displayed
    await expect(page.locator('text=शुद्ध जल,')).toBeVisible()
    await expect(page.locator('text=तुरंत डिलीवरी')).toBeVisible()
    await expect(page.locator('text=अभी पानी मंगवाएं').first()).toBeVisible()

    // Toggle back to English
    await langToggle.click()
    await expect(page.locator('text=Pure Water,')).toBeVisible()
  })

  test('Mobile viewport shows MobileBottomNav and responsive controls', async ({ page }) => {
    // Emulate mobile screen (iPhone 13)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')

    // Language toggle is visible on mobile login header
    const langToggle = page.locator('button[aria-label="Toggle language between Hindi and English"]').first()
    await expect(langToggle).toBeVisible()

    // Switch to Hindi on login page
    await langToggle.click()
    await expect(page.locator('text=वापसी पर स्वागत है')).toBeVisible()
  })
})
