import { expect, test, type Page } from '@playwright/test'

import { mockSupabaseAuth, signInAsStudent } from './support/auth'

const APP_TITLE = 'Tuteur de mathématiques — TCS'

/** The 3 px `:focus-visible` outline from `index.css` is drawn on the focused element. */
async function expectVisibleFocusRing(page: Page) {
  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element)
    return { style: style.outlineStyle, width: style.outlineWidth }
  })
  expect(outline).toEqual({ style: 'solid', width: '3px' })
}

test.describe('login page', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page, 'invalid')
    await page.goto('/login')
  })

  test('has a page title and labelled fields', async ({ page }) => {
    await expect(page).toHaveTitle(`Se connecter — ${APP_TITLE}`)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Adresse e-mail' })).toHaveAttribute(
      'autocomplete',
      'email',
    )
    await expect(page.getByLabel('Mot de passe')).toHaveAttribute(
      'autocomplete',
      'current-password',
    )
  })

  test('Tab order is email, password, submit, each with a visible focus ring', async ({
    page,
  }) => {
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Adresse e-mail')).toBeFocused()
    await expectVisibleFocusRing(page)

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Mot de passe')).toBeFocused()
    await expectVisibleFocusRing(page)

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeFocused()
    await expectVisibleFocusRing(page)
  })

  test('field borders meet the 3:1 non-text contrast colour', async ({ page }) => {
    // `--color-control` (#8a8274): 3.7:1 on the surface, versus 1.4:1 for the old `line` border.
    await expect(page.getByLabel('Adresse e-mail')).toHaveCSS(
      'border-top-color',
      'rgb(138, 130, 116)',
    )
    await expect(page.getByLabel('Mot de passe')).toHaveCSS(
      'border-top-color',
      'rgb(138, 130, 116)',
    )
  })

  test('a failed login keeps keyboard focus and ties the error to the fields', async ({
    page,
  }) => {
    await page.getByLabel('Adresse e-mail').fill('eleve.demo@example.test')
    await page.getByLabel('Mot de passe').fill('mauvais')
    const submit = page.getByRole('button', { name: 'Se connecter' })
    await submit.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('alert')).toHaveText('Adresse e-mail ou mot de passe incorrect.')
    await expect(submit).toBeFocused()
    for (const label of ['Adresse e-mail', 'Mot de passe']) {
      const field = page.getByLabel(label)
      await expect(field).toHaveAttribute('aria-invalid', 'true')
      await expect(field).toHaveAccessibleDescription('Adresse e-mail ou mot de passe incorrect.')
    }
  })
})

test.describe('application shell', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsStudent(page)
    await page.goto('/')
    await expect(page.getByTestId('profile-email')).toBeVisible()
  })

  test('the skip link is the first Tab stop, shows on focus, and moves focus to main', async ({
    page,
  }) => {
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Aller au contenu' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    await expectVisibleFocusRing(page)

    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()
  })

  test('Tab order follows the visual order: skip link, navigation, then sign-out', async ({
    page,
  }) => {
    const expected = [
      page.getByRole('link', { name: 'Aller au contenu' }),
      page.getByRole('link', { name: 'Cours' }),
      page.getByRole('link', { name: 'Entraînement' }),
      page.getByRole('link', { name: 'Plan d’étude' }),
      page.getByRole('link', { name: 'Historique' }),
      page.getByRole('button', { name: 'Se déconnecter' }),
    ]
    for (const target of expected) {
      await page.keyboard.press('Tab')
      await expect(target).toBeFocused()
      await expectVisibleFocusRing(page)
    }
  })

  test('navigating by keyboard moves focus to the new page and retitles the tab', async ({
    page,
  }) => {
    await expect(page).toHaveTitle(`Cours — ${APP_TITLE}`)

    const practice = page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('link', { name: 'Entraînement' })
    await practice.focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/practice$/)
    await expect(page.getByRole('main')).toBeFocused()
    await expect(page).toHaveTitle(`Entraînement — ${APP_TITLE}`)
    await expect(practice).toHaveAttribute('aria-current', 'page')
  })

  test('the profile is announced with its context', async ({ page }) => {
    await expect(page.getByText('Connecté en tant que')).toHaveClass(/sr-only/)
    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
  })
})
