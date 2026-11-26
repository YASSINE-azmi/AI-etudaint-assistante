import { expect, test, type Page } from '@playwright/test'

import { mockSupabaseAuth, signInAsStudent } from './support/auth'
import {
  ALL_GATES_PASSED,
  CITATION,
  SESSION_ID,
  installTurnStream,
  parts,
  pushParts,
  queueTurnReply,
  turnRequests,
} from './support/turn-stream'

// UI tier: the turn stream is stubbed to the Appendix D contract (see support/turn-stream.ts).
// These tests prove the client against the written contract, not the backend integration.

const MATH_TEXT = 'Pour tout réel $x$, on a $|x| \\geq 0$.'

async function ask(page: Page, question: string) {
  await page.getByLabel('Ta question').fill(question)
  await page.getByLabel('Ta question').press('Control+Enter')
}

const tutor = (page: Page) => page.getByRole('article', { name: 'Réponse du tuteur' })

test.beforeEach(async ({ page }) => {
  await signInAsStudent(page)
  await installTurnStream(page)
  await page.goto(`/session/${SESSION_ID}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Séance de travail' })).toBeVisible()
})

test('the request carries the bearer token, a UUID Idempotency-Key, and only the prompt', async ({
  page,
}) => {
  await ask(page, 'Qu’est-ce qu’une valeur absolue ?')
  await expect.poll(async () => (await turnRequests(page)).length).toBe(1)

  const [request] = await turnRequests(page)
  expect(request.headers['authorization']).toMatch(/^Bearer /)
  expect(request.headers['idempotency-key']).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
  // §13.3: the new prompt only, never useChat's message list.
  expect(request.body).toEqual({ prompt: 'Qu’est-ce qu’une valeur absolue ?' })
  await expect(page.getByRole('article', { name: 'Question envoyée' })).toHaveText(
    'Qu’est-ce qu’une valeur absolue ?',
  )
})

test('accepted turn: progress states, no text before message.final, then math and sources', async ({
  page,
}) => {
  await ask(page, 'Valeur absolue ?')
  await expect(tutor(page).getByRole('status')).toHaveText('Envoi de ta question…')

  await pushParts(page, 0, [parts.start(), parts.turnStarted()])
  await expect(tutor(page).getByRole('status')).toHaveText('Recherche dans le manuel…')

  await pushParts(page, 0, [parts.retrievalCompleted(), parts.validationStarted()])
  await expect(tutor(page).getByRole('status')).toHaveText('Vérification de la réponse…')
  await expect(tutor(page).locator('[data-state="pending"]')).toHaveCount(4)

  // The single text-delta arrives before data-message-final: it must not be displayed (§7.2).
  await pushParts(page, 0, [
    parts.validationCompleted('accepted', ALL_GATES_PASSED),
    ...parts.text(MATH_TEXT),
  ])
  await expect(tutor(page)).not.toContainText('Pour tout réel')
  await expect(tutor(page).locator('.katex')).toHaveCount(0)

  await pushParts(page, 0, [
    parts.messageFinal([CITATION]),
    parts.turnCompleted(),
    parts.finish(),
    '[DONE]',
  ])
  await expect(tutor(page)).toHaveAttribute('aria-label', 'Réponse du tuteur')
  await expect(tutor(page).locator('[data-turn-state="accepted"]')).toBeVisible()
  await expect(tutor(page)).toContainText('Pour tout réel')
  await expect(tutor(page).locator('[data-math="inline"] .katex')).toHaveCount(2)
  await expect(tutor(page).locator('[data-state="passed"]')).toHaveCount(4)
  await expect(tutor(page).locator('blockquote')).toHaveText('« exemple synthétique »')
  await expect(tutor(page).locator('figcaption')).toHaveText(
    'MAXI Maths — Définition (fixture) · p. 12',
  )
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeVisible()
})

test('refusal turn: French template, code, next actions, and no sources', async ({ page }) => {
  await ask(page, 'Calcule cette dérivée de 2BAC')
  await pushParts(page, 0, [
    parts.start(),
    parts.turnStarted(),
    parts.validationStarted(),
    parts.validationCompleted('outside_scope', [{ gate: 'scope', passed: false }]),
    ...parts.text('Cette question dépasse le programme du Tronc Commun Scientifique.'),
    parts.messageFinal([], 'OUT_OF_SCOPE_LEVEL', ['Choisir une notion du chapitre']),
    parts.turnCompleted(),
    parts.finish(),
    '[DONE]',
  ])

  const banner = tutor(page).locator('[data-educational-status="outside_scope"]')
  await expect(banner.getByRole('heading', { name: 'Hors du programme' })).toBeVisible()
  await expect(banner).toContainText('dépasse le programme')
  await expect(banner.locator('code')).toHaveText('OUT_OF_SCOPE_LEVEL')
  await expect(banner.getByRole('listitem')).toHaveText(['Choisir une notion du chapitre'])
  await expect(tutor(page).getByRole('heading', { name: 'Sources' })).toHaveCount(0)
})

test('insufficient evidence is a refusal, not an answer', async ({ page }) => {
  await ask(page, 'Question sans preuve')
  await pushParts(page, 0, [
    parts.start(),
    parts.turnStarted(),
    parts.retrievalCompleted(),
    parts.validationStarted(),
    parts.validationCompleted('insufficient_evidence', [
      { gate: 'source', passed: true },
      { gate: 'scope', passed: true },
      { gate: 'grounding', passed: false },
    ]),
    ...parts.text('Le manuel validé ne contient pas assez d’éléments.'),
    parts.messageFinal([], 'INSUFFICIENT_EVIDENCE'),
    parts.turnCompleted(),
    parts.finish(),
    '[DONE]',
  ])

  await expect(
    tutor(page).getByRole('heading', { name: 'Le manuel ne suffit pas pour répondre' }),
  ).toBeVisible()
  await expect(tutor(page).locator('[data-gate="grounding"]')).toHaveAttribute(
    'data-state',
    'failed',
  )
})

test('retryable failure: Réessayer resends the same submission with the same key', async ({
  page,
}) => {
  await ask(page, 'Question')
  await pushParts(page, 0, [
    parts.start(),
    parts.turnStarted(),
    parts.turnFailed({
      code: 'PROVIDER_UNAVAILABLE',
      educationalStatus: 'provider_unavailable',
      messageFr: 'Le service est momentanément indisponible.',
      retryable: true,
    }),
    parts.finish(),
    '[DONE]',
  ])
  await expect(
    tutor(page).getByRole('heading', { name: 'Service momentanément indisponible' }),
  ).toBeVisible()
  await expect(tutor(page)).not.toContainText('Envoi de ta question')

  await tutor(page).getByRole('button', { name: 'Réessayer' }).click()
  await expect.poll(async () => (await turnRequests(page)).length).toBe(2)

  const [first, retry] = await turnRequests(page)
  expect(retry.headers['idempotency-key']).toBe(first.headers['idempotency-key'])
  expect(retry.body).toEqual({ prompt: 'Question' })
})

test('non-retryable failure (credits exhausted): no text, no retry button', async ({ page }) => {
  await ask(page, 'Question')
  await pushParts(page, 0, [
    parts.start(),
    parts.turnStarted(),
    parts.turnFailed({
      code: 'CREDIT_EXHAUSTED',
      educationalStatus: 'credit_exhausted',
      messageFr: 'Les crédits de démonstration sont épuisés.',
      retryable: false,
    }),
    parts.finish(),
    '[DONE]',
  ])

  await expect(
    tutor(page).getByRole('heading', { name: 'Crédits de démonstration épuisés' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0)
})

test('a new question gets a new Idempotency-Key', async ({ page }) => {
  await ask(page, 'Première')
  await pushParts(page, 0, [
    parts.start(),
    parts.turnStarted(),
    parts.validationCompleted('accepted', ALL_GATES_PASSED),
    ...parts.text('Réponse.'),
    parts.messageFinal([CITATION]),
    parts.turnCompleted(),
    parts.finish(),
    '[DONE]',
  ])
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeVisible()

  await ask(page, 'Deuxième')
  await expect.poll(async () => (await turnRequests(page)).length).toBe(2)
  const [first, second] = await turnRequests(page)
  expect(second.headers['idempotency-key']).not.toBe(first.headers['idempotency-key'])
  expect(second.body).toEqual({ prompt: 'Deuxième' })
})

test('unrenderable math in a validated message shows an error state, never raw LaTeX', async ({
  page,
}) => {
  await ask(page, 'Question')
  await pushParts(page, 0, [
    parts.start(),
    parts.turnStarted(),
    parts.validationCompleted('accepted', ALL_GATES_PASSED),
    ...parts.text('Voir $\\href{https://example.test}{x}$'),
    parts.messageFinal([CITATION]),
    parts.turnCompleted(),
    parts.finish(),
    '[DONE]',
  ])

  await expect(tutor(page).getByRole('alert')).toContainText('ne peut pas être affichée')
  await expect(tutor(page)).not.toContainText('href')
})

test('HTTP 429 before the stream: French message and a retry', async ({ page }) => {
  await queueTurnReply(page, { status: 429, body: { detail: 'Too Many Requests' } })
  await ask(page, 'Question')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Trop de demandes')
  await expect(alert).not.toContainText('Too Many Requests')
  await expect(alert.getByRole('button', { name: 'Réessayer' })).toBeVisible()
})

test('HTTP 409 turn limit before the stream: server message, no retry', async ({ page }) => {
  // §7.6 body, with the TURN_LIMIT_REACHED template from refusal.py.
  await queueTurnReply(page, {
    status: 409,
    body: {
      code: 'TURN_LIMIT_REACHED',
      messageFr:
        'Cette séance a atteint sa limite de questions. Ouvre une nouvelle séance pour continuer.',
      requestId: 'req-1',
    },
  })
  await ask(page, 'Question')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('atteint sa limite de questions')
  await expect(alert.getByRole('button', { name: 'Réessayer' })).toHaveCount(0)
})

test('network failure before the stream: French message and a retry', async ({ page }) => {
  await queueTurnReply(page, 'network-error')
  await ask(page, 'Question')

  await expect(page.getByRole('alert')).toContainText('Impossible de joindre le serveur')
})

test('401 on the turn stream ends the session like any API call', async ({ page }) => {
  await mockSupabaseAuth(page)
  await queueTurnReply(page, { status: 401, body: { detail: 'Invalid or expired token' } })
  await ask(page, 'Question')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Votre session a expiré. Reconnectez-vous.')).toBeVisible()
})

test('the composer enforces the 4,000-character prompt limit (§6.5)', async ({ page }) => {
  await expect(page.getByLabel('Ta question')).toHaveAttribute('maxlength', '4000')
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
  await expect(page.getByTestId('history-notice')).toContainText('ne peut pas encore être rechargé')
})
