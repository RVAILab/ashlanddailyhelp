import { expect, test } from '@playwright/test'

test('the homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Ashland Daily Help' })).toBeVisible()
})

test('the health check reaches the database', async ({ request }) => {
  const response = await request.get('/health')
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ ok: true, database: 'ok' })
})

test('every page says when the listings were published', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('contentinfo')).toContainText(/Listings as of \w{3}, \w{3} \d+/)
  await expect(page.getByRole('contentinfo')).toContainText('This is demonstration data.')
})
