import { expect, test } from '@playwright/test'

// Dev-only gallery (src/pages/ComponentFixturesPage.tsx). The microphone is Chromium's fake
// device (playwright.config.ts). Upload and transcription are not wired: their contracts are
// missing, so these tests cover capture, stop timing, permissions, and file checks only.

const pushToTalk = '[data-fixture="push-to-talk"]'

test.describe('push-to-talk', () => {
  test('records on press and releases the microphone in under 500 ms on stop', async ({
    page,
  }) => {
    // Keep a handle on the captured stream to read its tracks' state.
    await page.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await original(constraints)
        Object.assign(window, { __micStream: stream })
        return stream
      }
    })
    await page.goto('/dev/composants')
    const fixture = page.locator(pushToTalk)

    await fixture.getByRole('button', { name: 'Parler' }).click()
    await expect(fixture.locator('[data-recorder-state="recording"]')).toBeVisible()
    await expect(fixture.getByRole('button', { name: 'Arrêter l’enregistrement' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const elapsed = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const stream = (window as unknown as { __micStream: MediaStream }).__micStream
          const button = [...document.querySelectorAll('button')].find(
            (item) => item.textContent === 'Arrêter l’enregistrement',
          )
          const started = performance.now()
          button?.click()
          const check = () => {
            if (stream.getTracks().every((track) => track.readyState === 'ended')) {
              resolve(performance.now() - started)
            } else {
              requestAnimationFrame(check)
            }
          }
          check()
        }),
    )
    expect(elapsed).toBeLessThan(500)

    await expect(fixture.locator('[data-recorder-state="idle"]')).toBeVisible()
    await expect(fixture).toContainText('l’audio n’a pas été conservé')
  })

  test('a denied microphone gives a French explanation and no recording', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
    })
    await page.goto('/dev/composants')
    const fixture = page.locator(pushToTalk)

    await fixture.getByRole('button', { name: 'Parler' }).click()
    await expect(fixture.locator('[data-recorder-state="denied"]')).toBeVisible()
    await expect(fixture.getByRole('status')).toContainText('L’accès au micro est refusé')
    await expect(fixture.getByRole('button', { name: 'Parler' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  test('no microphone found: French message', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Requested device not found', 'NotFoundError'))
    })
    await page.goto('/dev/composants')
    const fixture = page.locator(pushToTalk)

    await fixture.getByRole('button', { name: 'Parler' }).click()
    await expect(fixture.getByRole('status')).toContainText('Aucun micro utilisable')
  })
})

test.describe('exercise photo', () => {
  // 1×1 transparent PNG.
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  )

  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/composants')
  })

  test('an accepted photo shows a preview that can be removed', async ({ page }) => {
    const fixture = page.locator('[data-fixture="photo"]')
    await fixture
      .getByLabel(/Photo de l’exercice/)
      .setInputFiles({ name: 'exercice.png', mimeType: 'image/png', buffer: PNG })

    await expect(fixture.getByRole('img', { name: 'Aperçu de la photo choisie' })).toBeVisible()
    await expect(fixture).toContainText('exercice.png')

    await fixture.getByRole('button', { name: 'Retirer la photo' }).click()
    await expect(fixture.getByRole('img')).toHaveCount(0)
  })

  test('a file outside the JPEG/PNG/WebP allowlist is refused', async ({ page }) => {
    const fixture = page.locator('[data-fixture="photo"]')
    const input = fixture.getByLabel(/Photo de l’exercice/)
    await input.setInputFiles({ name: 'scan.gif', mimeType: 'image/gif', buffer: PNG })

    await expect(fixture.getByRole('alert')).toHaveText(
      'Format non accepté. Choisis une photo JPEG, PNG ou WebP.',
    )
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(fixture.getByRole('img')).toHaveCount(0)
  })

  test('a photo over 10 MB is refused', async ({ page }) => {
    const fixture = page.locator('[data-fixture="photo"]')
    await fixture.getByLabel(/Photo de l’exercice/).setInputFiles({
      name: 'lourde.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    })

    await expect(fixture.getByRole('alert')).toHaveText('Photo trop lourde : 10 Mo au maximum.')
  })
})
