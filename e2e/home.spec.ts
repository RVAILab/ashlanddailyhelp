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

// Fonts and art are extras, saved on the device after the first visit and left out under Save-Data (the art), so
// they have a budget of their own.
test('the first load of the homepage stays under 100 KB besides fonts and art, and loads no JavaScript files', async ({
  page,
}) => {
  const bodies: Array<Promise<{ extra: boolean; size: number }>> = []
  page.on('response', response => {
    const extra = /\/(fonts|art)\//.test(new URL(response.url()).pathname)
    bodies.push(
      response.body().then(
        body => ({ extra, size: body.length }),
        () => ({ extra, size: 0 }),
      ),
    )
  })
  await page.goto('/', { waitUntil: 'networkidle' })
  const sizes = await Promise.all(bodies)
  const total = (extra: boolean) => sizes.filter(body => body.extra === extra).reduce((sum, body) => sum + body.size, 0)
  expect(await page.locator('script[src], script[type="module"]').count()).toBe(0)
  expect(total(false)).toBeLessThan(100_000)
  expect(total(true)).toBeLessThan(200_000)
})

test('the search page still hydrates', async ({ page }) => {
  await page.goto('/resources')
  expect(await page.locator('script[type="module"]').count()).toBeGreaterThan(0)
})
