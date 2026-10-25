import { expect, test } from '@playwright/test'

test('save two listings, see them on My list, and open the shared link elsewhere', async ({ page, browser }) => {
  await page.goto('/resources')
  await page
    .getByRole('article', { name: 'A shower and a fresh start' })
    .getByRole('link', { name: 'Add to my list' })
    .click()
  await page
    .getByRole('article', { name: 'A seat at the community table' })
    .getByRole('link', { name: 'Add to my list' })
    .click()
  await expect(page.getByRole('article', { name: 'A shower and a fresh start' }).getByText('On my list')).toBeVisible()

  await page.getByRole('link', { name: 'My list', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  const shared = await page.locator('.share-url').textContent()

  const elsewhere = await browser.newContext()
  const other = await elsewhere.newPage()
  await other.goto(shared ?? '')
  await expect(other.getByRole('heading', { level: 1, name: 'A shared list' })).toBeVisible()
  await expect(other.getByRole('article')).toHaveCount(2)
  await elsewhere.close()
})
