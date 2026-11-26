import { expect, test, type Page } from '@playwright/test'

import { signInAsStudent } from './support/auth'
import {
  ALL_GATES_PASSED,
  CITATION,
  SESSION_ID,
  abortedStreams,
  installTurnStream,
  parts,
  pushParts,
  streamCount,
} from './support/turn-stream'

// UI-tier interruption cases from docs/frontend/e2e-matrix.md, against a stream stubbed to
// Appendix D. NOT covered here, because the contract is missing (e2e-matrix V5): the call to
// `POST /sessions/{id}/interrupt`, its failure (I14), and the server's handling of stale turns.

const tutor = (page: Page) => page.getByRole('article', { name: 'Réponse du tuteur' })

async function ask(page: Page, question = 'Question') {
  await page.getByLabel('Ta question').fill(question)
  await page.getByLabel('Ta question').press('Control+Enter')
  await expect(page.getByRole('button', { name: 'Arrêter' })).toBeVisible()
}

/** Clicks Stop in the page and returns the ms until the UI shows the turn stopped (§2.6). */
async function stopAndMeasure(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const stop = [...document.querySelectorAll('button')].find(
          (button) => button.textContent === 'Arrêter',
        )
        const started = performance.now()
        stop?.click()
        const check = () => {
          const stopped =
            document.querySelector('[data-turn-state="interrupted"]') !== null &&
            ![...document.querySelectorAll('button')].some((b) => b.textContent === 'Arrêter')
          if (stopped) resolve(performance.now() - started)
          else requestAnimationFrame(check)
        }
        check()
      }),
  )
}

async function expectStopped(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: 'Réponse interrompue' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeVisible()
  await expect.poll(() => abortedStreams(page)).toBe(1)
}

test.beforeEach(async ({ page }) => {
  await signInAsStudent(page)
  await installTurnStream(page)
  await page.goto(`/session/${SESSION_ID}`)
})

test('I1 — before turn.started: UI stops in under 500 ms and the stream is aborted', async ({
  page,
}) => {
  await ask(page)
  expect(await stopAndMeasure(page)).toBeLessThan(500)
  await expectStopped(page)
})

test('I2–I4 — after turn.started, retrieval, and validation.started', async ({ page }) => {
  // Each turn has its own turnId, which the server also uses as the stream's messageId.
  const turn = (n: number) => `00000000-0000-4000-8000-00000000d10${n}`
  const stages = [
    [parts.start(turn(1)), parts.turnStarted(turn(1))],
    [parts.start(turn(2)), parts.turnStarted(turn(2)), parts.retrievalCompleted()],
    [
      parts.start(turn(3)),
      parts.turnStarted(turn(3)),
      parts.retrievalCompleted(),
      parts.validationStarted(),
    ],
  ]
  for (const [index, stage] of stages.entries()) {
    // Asking again right after a stop also checks the next question is really sent.
    await ask(page)
    await pushParts(page, index, stage)
    await expect(tutor(page).nth(index).getByRole('status')).toBeVisible()
    expect(await stopAndMeasure(page)).toBeLessThan(500)
    await expect(tutor(page).nth(index).locator('[data-turn-state="interrupted"]')).toBeVisible()
    await expect.poll(() => abortedStreams(page)).toBe(index + 1)
  }
})

test('I5–I6 — after validation and the text-delta, before message.final: no text shown', async ({
  page,
}) => {
  await ask(page)
  await pushParts(page, 0, [
    parts.start(),
    parts.turnStarted(),
    parts.validationStarted(),
    parts.validationCompleted('accepted', ALL_GATES_PASSED),
    ...parts.text('Texte non encore validé'),
  ])
  expect(await stopAndMeasure(page)).toBeLessThan(500)
  await expectStopped(page)
  await expect(page.getByText('Texte non encore validé')).toHaveCount(0)
})

test('I7 — between message.final and turn.completed: the validated answer stays', async ({
  page,
}) => {
  await ask(page)
  await pushParts(page, 0, [
    parts.start(),
    parts.turnStarted(),
    parts.validationCompleted('accepted', ALL_GATES_PASSED),
    ...parts.text('Réponse validée.'),
    parts.messageFinal([CITATION]),
  ])
  await expect(tutor(page)).toContainText('Réponse validée.')

  await page.getByRole('button', { name: 'Arrêter' }).click()
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeVisible()
  await expect(tutor(page)).toContainText('Réponse validée.')
  await expect(tutor(page).locator('[data-turn-state="interrupted"]')).toHaveCount(0)
})

test('I9 — late events for a stopped turn are never displayed', async ({ page }) => {
  await ask(page)
  await pushParts(page, 0, [parts.start(), parts.turnStarted()])
  await stopAndMeasure(page)

  // The server keeps sending the old turn: the aborted stream accepts nothing more.
  const delivered = await pushParts(page, 0, [
    parts.validationCompleted('accepted', ALL_GATES_PASSED),
    ...parts.text('Événement périmé'),
    parts.messageFinal([CITATION]),
  ])
  expect(delivered).toBe(false)

  // A new question starts a new turn on a new stream.
  await ask(page, 'Nouvelle question')
  expect(await streamCount(page)).toBe(2)
  await expect(page.getByText('Événement périmé')).toHaveCount(0)
  await expect(tutor(page).first().locator('[data-turn-state="interrupted"]')).toBeVisible()
})

test('I10 — Stop clicked twice aborts once', async ({ page }) => {
  await ask(page)
  await page.getByRole('button', { name: 'Arrêter' }).dblclick({ force: true }).catch(() => {})
  await expectStopped(page)
  expect(await abortedStreams(page)).toBe(1)
})

test('I17 — leaving the page during a turn aborts the stream', async ({ page }) => {
  await ask(page)
  await pushParts(page, 0, [parts.start(), parts.turnStarted()])

  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Historique' })
    .click()
  await expect(page).toHaveURL(/\/history$/)
  await expect.poll(() => abortedStreams(page)).toBe(1)
})

test('I19 — keyboard only: Stop with Enter, focus returns to the question field', async ({
  page,
}) => {
  await ask(page)
  await page.getByRole('button', { name: 'Arrêter' }).focus()
  await page.keyboard.press('Enter')

  await expectStopped(page)
  await expect(page.getByLabel('Ta question')).toBeFocused()
})
