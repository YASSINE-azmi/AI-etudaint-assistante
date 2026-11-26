import { expect, test } from '@playwright/test'

// Dev-only gallery: src/pages/ComponentFixturesPage.tsx with src/fixtures/turns.ts.
test.beforeEach(async ({ page }) => {
  await page.goto('/dev/composants')
})

test('validated answer: four gates passed and a short cited excerpt', async ({ page }) => {
  const fixture = page.locator('[data-fixture="accepted"]')

  await expect(fixture.locator('[data-state="passed"]')).toHaveCount(4)
  await expect(fixture.getByText('Ancrage : validé')).toBeVisible()
  await expect(fixture.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await expect(fixture.locator('blockquote')).toHaveText('« exemple synthétique »')
  await expect(fixture.locator('figcaption')).toHaveText(
    'MAXI Maths — Les ensembles de nombres · Définition (fixture) · p. 12',
  )
})

test('validation in progress: every gate is pending', async ({ page }) => {
  const fixture = page.locator('[data-fixture="validating"]')

  await expect(fixture.locator('[data-state="pending"]')).toHaveCount(4)
})

test('out-of-scope refusal: French message, code, next actions, and no sources', async ({
  page,
}) => {
  const fixture = page.locator('[data-fixture="out-of-scope"]')

  await expect(fixture.locator('[data-gate="scope"]')).toHaveAttribute('data-state', 'failed')
  await expect(fixture.locator('[data-state="skipped"]')).toHaveCount(3)

  const banner = fixture.locator('[data-educational-status="outside_scope"]')
  await expect(banner.getByRole('heading', { name: 'Hors du programme' })).toBeVisible()
  await expect(banner).toContainText('dépasse le programme du Tronc Commun Scientifique')
  await expect(banner.locator('code')).toHaveText('OUT_OF_SCOPE_LEVEL')
  await expect(banner.getByRole('listitem')).toHaveText([
    'Choisir une notion du chapitre',
    'Reformuler la question',
  ])
  await expect(fixture.getByRole('heading', { name: 'Sources' })).toHaveCount(0)
})

test('failed turn: provider-unavailable banner with its French message', async ({ page }) => {
  const banner = page.locator(
    '[data-fixture="provider-failure"] [data-educational-status="provider_unavailable"]',
  )

  await expect(
    banner.getByRole('heading', { name: 'Service momentanément indisponible' }),
  ).toBeVisible()
  await expect(banner).toContainText('Ta séance est conservée')
  await expect(banner.locator('code')).toHaveText('PROVIDER_UNAVAILABLE')
})

test('every streamed refusal and failure code renders its title, French text, and code', async ({
  page,
}) => {
  // Titles from RefusalBanner; texts from refusal.py (draft refusal-fr-v0.1-draft).
  const expected: [string, string, string][] = [
    ['OUT_OF_SCOPE_LEVEL', 'Hors du programme', 'dépasse le programme'],
    ['OUT_OF_SCOPE_CHAPTER', 'Hors du programme', 'pas encore disponible'],
    ['INSUFFICIENT_EVIDENCE', 'Le manuel ne suffit pas pour répondre', "pas assez d'éléments"],
    ['AMBIGUOUS_QUESTION', 'Une précision est nécessaire', "préciser l'expression"],
    ['MATH_UNVERIFIABLE', 'Réponse non validée', 'vérifier ce calcul'],
    ['MATH_INCORRECT', 'Réponse non validée', 'vérification mathématique'],
    ['RENDERING_UNSAFE', 'Réponse non validée', 'ne peut pas être affichée'],
    ['SOURCE_WITHDRAWN', 'Source retirée', 'a été retirée'],
    ['PROVIDER_UNAVAILABLE', 'Service momentanément indisponible', 'réessaie'],
    ['CREDIT_EXHAUSTED', 'Crédits de démonstration épuisés', 'crédits de démonstration'],
  ]
  const fixture = page.locator('[data-fixture="all-refusals"]')
  await expect(fixture.locator('[data-code]')).toHaveCount(expected.length)

  for (const [code, title, text] of expected) {
    const banner = fixture.locator(`[data-code="${code}"]`)
    await expect(banner.getByRole('heading', { name: title })).toBeVisible()
    await expect(banner).toContainText(text)
    await expect(banner.locator('code')).toHaveText(code)
  }
})

test('validated math renders inline and display KaTeX with accessible MathML', async ({
  page,
}) => {
  const fixture = page.locator('[data-fixture="math"]')

  await expect(fixture.locator('[data-math="inline"] .katex')).toHaveCount(2)
  await expect(fixture.locator('[data-math="display"] .katex-display')).toHaveCount(1)
  await expect(fixture.locator('math')).toHaveCount(3)
  await expect(fixture.locator('annotation')).toHaveText(['x', '|x| \\geq 0', '\\sqrt{4} = 2'])
  await expect(fixture).not.toContainText('$')
})

test('untrusted, invalid, or unbalanced math shows an error, never the raw notation', async ({
  page,
}) => {
  for (const id of ['math-untrusted', 'math-broken', 'math-unbalanced']) {
    const fixture = page.locator(`[data-fixture="${id}"]`)
    await expect(fixture.getByRole('alert')).toContainText('ne peut pas être affichée')
    await expect(fixture.locator('.katex')).toHaveCount(0)
    await expect(fixture.locator('p[role="alert"]')).not.toContainText('\\')
  }
})

test('an overlong excerpt is cut to 300 characters, never shown in full', async ({ page }) => {
  const quote = await page.locator('[data-fixture="overlong"] blockquote').innerText()
  const excerpt = quote.replace(/^« | »$/g, '')

  expect(excerpt.length).toBeLessThanOrEqual(300)
  expect(excerpt.endsWith('…')).toBe(true)
})
