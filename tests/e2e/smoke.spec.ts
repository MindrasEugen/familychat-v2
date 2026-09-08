import { expect, test } from '@playwright/test'

test('un visitatore non autenticato viene reindirizzato al login', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
})
