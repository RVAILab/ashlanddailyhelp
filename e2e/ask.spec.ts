import { expect, test } from '@playwright/test'

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  // A question the directory can't answer gets the 211 answer without a model call, so this costs nothing.
  test('ask a question from the homepage and get an answer page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Your question' }).fill('Where can I get my bicycle repaired?')
    await page.getByRole('button', { name: 'Ask' }).click()
    await expect(page).toHaveURL(/\/ask$/)
    const answer = page.getByRole('region', { name: /You asked/ })
    await expect(answer).toContainText('Where can I get my bicycle repaired?')
    await expect(answer).toContainText('211')
  })
})
