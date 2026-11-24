import { expect, test } from '@playwright/test'

test('classroom shell shows the approved chapters and active navigation', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Votre espace de mathématiques' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 3, name: 'Les ensembles de nombres' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Calcul vectoriel' })).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 3, name: 'Généralités sur les fonctions' }),
  ).toBeVisible()

  await expect(
    page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('link', { name: 'Cours' }),
  ).toHaveAttribute('aria-current', 'page')
})

test('unknown route renders the not-found page', async ({ page }) => {
  await page.goto('/inconnue')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Cette page n’existe pas.' }),
  ).toBeVisible()
})
