import { expect, test } from '@playwright/test'

test('the homepage leads to what is open today', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Open now and later today' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Open today' })).toBeVisible()
  await expect(page.getByRole('region', { name: /Hours not confirmed/ })).toBeVisible()
})
