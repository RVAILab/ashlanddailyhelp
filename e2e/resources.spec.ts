import { expect, test } from '@playwright/test'

test('find showers from the homepage, narrow by kind of help, and go back', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Search everything' }).click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('status')).toHaveText(/\d+ places/)

  await page.getByRole('searchbox', { name: 'Words to search for' }).fill('show')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page).toHaveURL(/q=show/)
  await expect(page.getByRole('button', { name: 'Search' })).toBeFocused()
  await expect(page.getByRole('article', { name: 'A shower and a fresh start' })).toBeVisible()

  await page.getByRole('combobox', { name: 'Kind of help' }).selectOption('food')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('status')).toHaveText('No places match')
  await expect(page.getByRole('link', { name: 'clear the search' })).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('searchbox', { name: 'Words to search for' })).toHaveValue('show')
  await expect(page.getByRole('article', { name: 'A shower and a fresh start' })).toBeVisible()
})

test('a shared search link opens the same results, even without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/resources?category=housing')
  await expect(page.getByRole('combobox', { name: 'Kind of help' })).toHaveValue('housing')
  await expect(page.getByRole('article', { name: 'Explore supportive shelter programs' })).toBeVisible()
  await context.close()
})

test('open a listing from a search, then go back to the same results', async ({ page }) => {
  await page.goto('/resources?q=show')
  await page.getByRole('link', { name: 'A shower and a fresh start' }).click()
  await expect(page).toHaveURL(/\/resources\/ohra-showers$/)
  await expect(page.getByRole('heading', { level: 1, name: 'A shower and a fresh start' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Sources' })).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('searchbox', { name: 'Words to search for' })).toHaveValue('show')
})

test('a listing that is not there answers 404 inside the site', async ({ page }) => {
  const response = await page.goto('/es/resources/no-such-listing')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1, name: 'Este servicio no está disponible' })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})
