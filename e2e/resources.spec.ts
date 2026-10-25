import { expect, test } from '@playwright/test'

test('find showers from the homepage, narrow by kind of help, and go back', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Find help' }).click()
  await expect(page.getByRole('status')).toHaveText(/\d+ places/)

  await page.getByRole('searchbox', { name: 'Words to search for' }).fill('show')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page).toHaveURL(/q=show/)
  await expect(page.getByRole('article', { name: 'A shower and a fresh start' })).toBeVisible()

  await page.getByRole('combobox', { name: 'Kind of help' }).selectOption('food')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('status')).toHaveText('No places match')
  await expect(page.getByRole('link', { name: 'clear the search' })).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('searchbox', { name: 'Words to search for' })).toHaveValue('show')
  await expect(page.getByRole('article', { name: 'A shower and a fresh start' })).toBeVisible()
})

test('a shared search link opens the same results, even without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/resources?category=housing&area=Medford')
  await expect(page.getByRole('combobox', { name: 'Area' })).toHaveValue('Medford')
  await expect(page.getByRole('article', { name: 'Explore supportive shelter programs' })).toBeVisible()
  await context.close()
})
