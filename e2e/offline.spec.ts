import { expect, test } from '@playwright/test'

test('after one visit, the main pages and listing pages work offline, saying so', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(async () => {
    const cache = await caches.open('daily-help-v1')
    const saved = (path: string) => cache.match(path, { ignoreVary: true })
    return Boolean((await saved('/resources/ohra-showers')) && (await saved('/today')))
  })
  await context.setOffline(true)

  for (const path of ['/', '/today', '/resources', '/resources/ohra-showers']) {
    await page.goto(path)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByText(/You.re offline/)).toBeVisible()
  }
  await expect(page.getByRole('contentinfo')).toContainText('Listings as of')
  await context.setOffline(false)
})

test('the health check is never answered from the device', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  const status = await page.evaluate(() =>
    fetch('/health').then(
      response => response.status,
      () => 'failed',
    ),
  )
  expect(status).toBe('failed')
  await context.setOffline(false)
})

test('Clear this device forgets the saved pages', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.getByRole('link', { name: 'Clear this device' }).click()
  await expect(page).toHaveURL(/\/\?cleared$/)
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0)
})
