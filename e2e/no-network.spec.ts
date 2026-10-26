import { expect, test } from '@playwright/test'

test('the browser cannot reach anything but the site under test', async ({ page }) => {
  await expect(page.goto('https://steward.ashlanddailyhelp.com/feed/')).rejects.toThrow(/ERR_NAME_NOT_RESOLVED/)
})

test.describe('the server', () => {
  test.use({
    extraHTTPHeaders: {
      'CF-Connecting-IP': `2001:db8::${crypto.randomUUID().slice(0, 4)}:${crypto.randomUUID().slice(0, 4)}`,
    },
  })

  // A question with matching listings would go to Claude; here the call fails locally and the answer falls back.
  test('answers a question about listed help without calling Claude', async ({ page }) => {
    await page.goto('/ask')
    await page.getByRole('textbox', { name: 'Your question' }).fill('Where can I take a shower?')
    await page.getByRole('button', { name: 'Ask' }).click()
    const answer = page.getByRole('region', { name: /You asked/ })
    await expect(answer).toContainText('I couldn’t find that in the Daily Help directory')
  })
})
