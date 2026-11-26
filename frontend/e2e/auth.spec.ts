import { expect, test } from '@playwright/test'

import {
  STUDENT,
  STUDENT_ME,
  fakeSession,
  mockMe,
  mockSupabaseAuth,
  seedSession,
  signInAsStudent,
} from './support/auth'

const EXPIRED_NOTICE = 'Votre session a expiré. Reconnectez-vous.'

test('missing session: a protected route redirects to the email-only login form', async ({
  page,
}) => {
  await mockSupabaseAuth(page)
  const meRequests = await mockMe(page, { status: 200, body: STUDENT_ME })

  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Se connecter' })).toBeVisible()
  await expect(page.getByLabel('Adresse e-mail')).toBeVisible()
  await expect(page.getByLabel('Mot de passe')).toBeVisible()
  await expect(page.getByText(/google|sso/i)).toHaveCount(0)
  await expect(page.getByText(EXPIRED_NOTICE)).toHaveCount(0)
  expect(meRequests).toHaveLength(0)
})

test('valid session: /me is called with the bearer token and the profile is shown', async ({
  page,
}) => {
  const meRequests = await signInAsStudent(page)

  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Votre espace de mathématiques' }),
  ).toBeVisible()
  await expect(page.getByTestId('profile-email')).toHaveText(STUDENT.email)
  await expect(page.getByText('Élève', { exact: true })).toBeVisible()
  expect(meRequests[0].headers()['authorization']).toMatch(/^Bearer [\w-]+\.[\w-]+\.signature$/)
})

test('expired session that cannot be refreshed: back to login with a French notice', async ({
  page,
}) => {
  await mockSupabaseAuth(page)
  const meRequests = await mockMe(page, { status: 200, body: STUDENT_ME })
  await seedSession(page, fakeSession(-60))

  await page.goto('/history')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText(EXPIRED_NOTICE)).toBeVisible()
  expect(meRequests).toHaveLength(0)
})

test('token rejected by the API (401): session ends with the expired notice', async ({
  page,
}) => {
  await mockSupabaseAuth(page)
  await mockMe(page, { status: 401, body: { detail: 'Invalid or expired token' } })
  await seedSession(page, fakeSession(3600))

  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText(EXPIRED_NOTICE)).toBeVisible()
})

test('forbidden (403): French access-denied screen, no retry', async ({ page }) => {
  await mockSupabaseAuth(page)
  await mockMe(page, { status: 403, body: { detail: 'Forbidden' } })
  await seedSession(page, fakeSession(3600))

  await page.goto('/')

  const alert = page.getByRole('alert')
  await expect(alert.getByRole('heading', { name: 'Accès refusé.' })).toBeVisible()
  await expect(alert).toContainText('Vous n’avez pas accès à cette ressource.')
  await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
})

test('network error on /me: French message, then retry succeeds', async ({ page }) => {
  await mockSupabaseAuth(page)
  await mockMe(page, 'network-error', { status: 200, body: STUDENT_ME })
  await seedSession(page, fakeSession(3600))

  await page.goto('/')

  const alert = page.getByRole('alert')
  await expect(alert.getByRole('heading', { name: 'Connexion au serveur impossible.' })).toBeVisible()
  await expect(alert).toContainText('Vérifiez votre connexion')

  await page.getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByTestId('profile-email')).toHaveText(STUDENT.email)
})

test('login with email and password, then return to the page first requested', async ({
  page,
}) => {
  const authRequests = await mockSupabaseAuth(page, 'success')
  await mockMe(page, { status: 200, body: STUDENT_ME })

  await page.goto('/history')
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Adresse e-mail').fill(STUDENT.email)
  await page.getByLabel('Mot de passe').fill('mot-de-passe-demo')
  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page).toHaveURL(/\/history$/)
  await expect(page.getByTestId('profile-email')).toHaveText(STUDENT.email)
  const login = authRequests.find((request) => request.url().includes('grant_type=password'))
  expect(login?.postDataJSON()).toMatchObject({ email: STUDENT.email })
})

test('login with wrong credentials shows a French error and stays on the form', async ({
  page,
}) => {
  await mockSupabaseAuth(page, 'invalid')
  await mockMe(page, { status: 200, body: STUDENT_ME })

  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').fill(STUDENT.email)
  await page.getByLabel('Mot de passe').fill('mauvais')
  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page.getByRole('alert')).toHaveText('Adresse e-mail ou mot de passe incorrect.')
  await expect(page).toHaveURL(/\/login$/)
})

test('logout revokes the session and returns to login without the expired notice', async ({
  page,
}) => {
  await signInAsStudent(page)
  const authRequests = await mockSupabaseAuth(page)

  await page.goto('/')
  await page.getByRole('button', { name: 'Se déconnecter' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText(EXPIRED_NOTICE)).toHaveCount(0)
  expect(authRequests.some((request) => request.url().includes('/logout'))).toBe(true)
})
