import { expect, test } from '@playwright/test'

test('la app si carica e mostra il placeholder camere', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Le tue camere' })).toBeVisible()
})
