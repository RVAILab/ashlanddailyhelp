import { expect, test } from '@playwright/test'

test('the homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Find help' })).toBeVisible()
})

test('the health check reaches the database', async ({ request }) => {
  const response = await request.get('/health')
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ ok: true, database: 'ok' })
})

for (const path of ['/', '/no-such-page']) {
  test(`${path} says when the listings were published`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(path === '/' ? 200 : 404)
    await expect(page.getByRole('contentinfo')).toContainText(/Listings as of \w{3}, \w{3} \d+, \d{4}/)
    await expect(page.getByRole('contentinfo')).toContainText('This is demonstration data.')
  })
}
