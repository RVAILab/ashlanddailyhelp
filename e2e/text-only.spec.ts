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
