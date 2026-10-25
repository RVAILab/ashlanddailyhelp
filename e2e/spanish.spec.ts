import { expect, test } from '@playwright/test'

test.describe('a browser that prefers Spanish', () => {
  test.use({ locale: 'es-MX' })

  test('lands on the Spanish site, can switch to English, and is remembered', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/es$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.getByRole('link', { name: 'Buscar ayuda' })).toBeVisible()

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
  await expect(page.getByRole('contentinfo')).toContainText('Servicios actualizados al')

  await page.getByRole('link', { name: 'English' }).click()
  await expect(page).toHaveURL(/\/resources\?q=show$/)
  await expect(page.getByRole('searchbox', { name: 'Words to search for' })).toHaveValue('show')
})
