import { expect, test } from '@playwright/test'

import { signInAsStudent } from './support/auth'

test.beforeEach(async ({ page }) => {
  await signInAsStudent(page)
})

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

test('session route opens the classroom and says history cannot be reloaded yet', async ({
  page,
}) => {
  await page.goto('/session/demo-123')

  await expect(page.getByRole('heading', { level: 1, name: 'Séance de travail' })).toBeVisible()
  await expect(page.getByText('demo-123')).toBeVisible()
  await expect(page.getByTestId('history-notice')).toBeVisible()
  await expect(page.getByLabel('Ta question')).toBeVisible()
})

test('the demo label is visible on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByTestId('demo-label')).toBeVisible()
  await expect(page.getByTestId('demo-label')).toHaveText('Démo v0.1.0 · données synthétiques')
})

test('chapter grid leaves no empty cell on tablet and keeps three columns on desktop', async ({
  page,
}) => {
  const cardWidths = () =>
    page
      .getByRole('heading', { level: 2, name: 'Les trois chapitres retenus' })
      .locator('xpath=ancestor::section[1]')
      .locator('ul > li')
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().width)))

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 3, name: 'Calcul vectoriel' })).toBeVisible()
  const [first, second, third] = await cardWidths()
  expect(first).toBe(second)
  expect(third).toBeGreaterThan(first * 2)

  await page.setViewportSize({ width: 1440, height: 900 })
  const desktop = await cardWidths()
  expect(new Set(desktop).size).toBe(1)
})

test('going offline shows a French banner, which clears when back online', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await expect(page.getByTestId('profile-email')).toBeVisible()

  await context.setOffline(true)
  await expect(page.getByTestId('offline-banner')).toContainText('Hors ligne')

  await context.setOffline(false)
  await expect(page.getByTestId('offline-banner')).toHaveCount(0)
})

test('unknown route renders the not-found page', async ({ page }) => {
  await page.goto('/inconnue')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Cette page n’existe pas.' }),
  ).toBeVisible()
})
