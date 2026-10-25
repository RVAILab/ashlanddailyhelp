import { expect, test } from '@playwright/test'

test.describe('a browser that prefers Spanish', () => {
  test.use({ locale: 'es-MX' })

  test('lands on the Spanish site, can switch to English, and is remembered', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/es$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.getByRole('link', { name: 'Buscar en todo' })).toBeVisible()

    await page.getByRole('link', { name: 'English' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await page.goto('/resources')
    await expect(page).toHaveURL(/\/resources$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Find help' })).toBeVisible()
  })
})

test('a shared Spanish search link opens in Spanish and keeps the search when switching language', async ({ page }) => {
  await page.goto('/es/resources?q=show')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('searchbox', { name: 'Palabras para buscar' })).toHaveValue('show')
  await expect(page.getByRole('contentinfo')).toContainText('Lista actualizada el')

  await page.getByRole('link', { name: 'English' }).click()
  await expect(page).toHaveURL(/\/resources\?q=show$/)
  await expect(page.getByRole('searchbox', { name: 'Words to search for' })).toHaveValue('show')
})

test.describe('a browser that prefers Spanish and keeps no cookies', () => {
  test.use({ locale: 'es-MX' })

  test('can still reach English from the language link', async ({ page, context }) => {
    await page.goto('/es')
    await page.getByRole('link', { name: 'English' }).click()
    await context.clearCookies()
    await page.getByRole('link', { name: 'Search everything' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Find help' })).toBeVisible()
  })
})

test('an upper-case /ES address opens the Spanish page', async ({ page }) => {
  await page.goto('/ES/resources')
  await expect(page).toHaveURL(/\/es\/resources$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
})

test('pages name their other-language versions with full addresses', async ({ page }) => {
  await page.goto('/resources?q=show')
  const alternate = page.locator('link[rel="alternate"][hreflang="es"]')
  await expect(alternate).toHaveAttribute('href', 'http://localhost:4173/es/resources?q=show')
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
    'href',
    'http://localhost:4173/resources?q=show',
  )
})
