import { expect, test } from '@playwright/test'

test.describe('the homepage on a small phone', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('ends the page with the emergency numbers in the footer', async ({ page }) => {
    await page.goto('/')
    for (const number of ['911', '988', '211'])
      await expect(page.getByRole('contentinfo').locator(`a[href="tel:${number}"]`)).toBeVisible()
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
})

test('the first load of the homepage stays under 100 KB and runs no JavaScript', async ({ page }) => {
  const bodies: Array<Promise<number>> = []
  page.on('response', response =>
    bodies.push(
      response.body().then(
        body => body.length,
        () => 0,
      ),
    ),
  )
  await page.goto('/', { waitUntil: 'networkidle' })
  const bytes = (await Promise.all(bodies)).reduce((sum, size) => sum + size, 0)
  expect(await page.locator('script').count()).toBe(0)
  expect(bytes).toBeLessThan(100_000)
})

test('the search page still hydrates', async ({ page }) => {
  await page.goto('/resources')
  expect(await page.locator('script[type="module"]').count()).toBeGreaterThan(0)
})
