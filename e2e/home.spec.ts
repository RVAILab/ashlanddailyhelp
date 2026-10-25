import { expect, test } from '@playwright/test'

test.describe('the homepage on a small phone', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('shows the emergency numbers without scrolling', async ({ page }) => {
    await page.goto('/')
    for (const number of ['911', '988', '211']) {
      const link = page.locator(`a[href="tel:${number}"]`).first()
      await expect(link).toBeInViewport()
    }
  })

  test('gives every link a target at least 44px tall and the page no sideways scroll', async ({ page }) => {
    await page.goto('/')
    const small = await page
      .locator('main a, header a')
      .evaluateAll(links =>
        links.filter(link => link.getBoundingClientRect().height < 44).map(link => link.textContent),
      )
    expect(small).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  })

  test('reaches the emergency numbers right after the site header in keyboard order', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('href', 'tel:911')
  })
})

test('the first load of the homepage stays under 100 KB and runs no JavaScript', async ({ page }) => {
  let bytes = 0
  page.on('response', async response => {
    const body = await response.body().catch(() => Buffer.alloc(0))
    bytes += body.length
  })
  await page.goto('/', { waitUntil: 'networkidle' })
  expect(await page.locator('script').count()).toBe(0)
  expect(bytes).toBeLessThan(100_000)
})

test('the search page still hydrates', async ({ page }) => {
  await page.goto('/resources')
  expect(await page.locator('script[type="module"]').count()).toBeGreaterThan(0)
})
