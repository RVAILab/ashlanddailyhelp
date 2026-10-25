import { expect, test } from '@playwright/test'

test('text-only mode loads no fonts or pictures, is remembered, and search still works', async ({ page }) => {
  const extras: string[] = []
  page.on('request', request => {
    if (/\/(fonts|art)\//.test(new URL(request.url()).pathname)) extras.push(request.url())
  })
  await page.goto('/')
  await page.getByRole('link', { name: 'Text-only version (uses less data)' }).click()
  await expect(page).toHaveURL(/\/$/)
  extras.length = 0
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/text-only/)
  await page.getByRole('searchbox', { name: 'Search for help' }).fill('shower')
  await page.getByRole('button', { name: /Find help/ }).click()
  await expect(page.getByRole('status')).toHaveText(/\d+ place/)
  expect(extras).toEqual([])
  await page.getByRole('link', { name: 'Full version, with pictures' }).click()
  await expect(page.locator('html')).not.toHaveClass(/text-only/)
})

test.describe('with Save-Data', () => {
  test.use({ extraHTTPHeaders: { 'Save-Data': 'on' } })

  test('starts in text-only mode', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/text-only/)
    expect(await page.locator('img').count()).toBe(0)
  })
})

test('after switching, the pages saved for offline come back in the new mode', async ({ page, context }) => {
  const saved = (path: string) =>
    page.evaluate(async path => {
      const copy = await (await caches.open('daily-help-pages-v2')).match(path, { ignoreVary: true })
      return copy ? (await copy.text()).includes('class="text-only"') : null
    }, path)
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect.poll(() => saved('/today'), { timeout: 15_000 }).toBe(false)
  await page.getByRole('link', { name: 'Text-only version (uses less data)' }).click()
  await expect.poll(() => saved('/today'), { timeout: 15_000 }).toBe(true)
  await context.setOffline(true)
  await page.goto('/today')
  await expect(page.locator('html')).toHaveClass(/text-only/)
  await context.setOffline(false)
})

test.describe('in text-only mode', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: 'text', value: 'on', url: 'http://localhost:4173' }])
  })

  test('the saved list still works', async ({ page }) => {
    await page.goto('/resources')
    await expect(page.locator('html')).toHaveClass(/text-only/)
    await page
      .getByRole('article', { name: 'A shower and a fresh start' })
      .getByRole('link', { name: 'Add to my list' })
      .click()
    await page.getByRole('link', { name: 'My list', exact: true }).click()
    await expect(page.getByRole('article', { name: 'A shower and a fresh start' })).toBeVisible()
  })
})
