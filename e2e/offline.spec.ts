import { expect, test } from '@playwright/test'

declare global {
  function savedPages(paths: string[]): Promise<boolean>
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.savedPages = async paths => {
      const cache = await caches.open('daily-help-pages-v2')
      for (const path of paths) if (!(await cache.match(path, { ignoreVary: true }))) return false
      return true
    }
  })
})

test('after one visit, the main pages and listing pages work offline, saying so', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  // An async function's promise is truthy, so poll with page.evaluate rather than waitForFunction.
  await expect
    .poll(() => page.evaluate(() => savedPages(['/', '/today', '/resources', '/about', '/resources/ohra-showers'])), {
      timeout: 15_000,
    })
    .toBe(true)
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
  await expect.poll(() => page.evaluate(async () => await caches.keys()), { timeout: 5_000 }).toEqual([])
})

test('offline, a search shows every saved listing rather than another search’s results', async ({ page, context }) => {
  await page.goto('/resources?q=show')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.goto('/resources')
  await expect.poll(() => page.evaluate(() => savedPages(['/resources'])), { timeout: 15_000 }).toBe(true)
  await context.setOffline(true)
  await page.goto('/resources?q=meal')
  await expect(page.getByRole('status')).toHaveText(/\d+ places/)
  await expect(page.getByText(/searching needs a connection/)).toBeVisible()
  await context.setOffline(false)
})
