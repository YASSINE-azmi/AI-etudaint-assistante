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

test('login route is an explicit placeholder without a sign-in form', async ({ page }) => {
  await page.goto('/login')

  await expect(
    page.getByRole('heading', { level: 1, name: 'La connexion n’est pas encore disponible.' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toHaveText(
    'Écran provisoire · aucune authentification active',
  )
  await expect(page.locator('form')).toHaveCount(0)
})

test('session route is an explicit placeholder that loads no exchange', async ({ page }) => {
  await page.goto('/session/demo-123')

  await expect(
    page.getByRole('heading', { level: 2, name: 'Cette session ne peut pas encore être chargée.' }),
  ).toBeVisible()
  await expect(page.getByText('demo-123')).toBeVisible()
})

test('unknown route renders the not-found page', async ({ page }) => {
  await page.goto('/inconnue')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Cette page n’existe pas.' }),
  ).toBeVisible()
})
