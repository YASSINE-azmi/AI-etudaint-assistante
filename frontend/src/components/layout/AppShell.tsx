import { Suspense, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/components/auth/authContext'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { PageLoading } from '@/components/layout/PageLoading'
import type { Role } from '@/lib/api-types'
import {
  BookOpenIcon,
  CalendarIcon,
  HistoryIcon,
  LayersIcon,
  PencilIcon,
} from '@/components/icons'

const NAV_ITEMS = [
  { to: '/', label: 'Cours', icon: BookOpenIcon, end: true },
  { to: '/practice', label: 'Entraînement', icon: PencilIcon, end: false },
  { to: '/study-plan', label: 'Plan d’étude', icon: CalendarIcon, end: false },
  { to: '/history', label: 'Historique', icon: HistoryIcon, end: false },
]

const ROLE_LABELS_FR: Record<Role, string> = {
  student: 'Élève',
  reviewer: 'Relecteur',
  admin: 'Administrateur',
}

function ProfileBadge() {
  const { state, signOut } = useAuth()
  if (state.status !== 'signed-in') return null
  const { email, role } = state.me

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-ink">
        <span className="sr-only">Connecté en tant que </span>
        <span data-testid="profile-email">{email ?? 'Compte sans e-mail'}</span>
        <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
          {ROLE_LABELS_FR[role]}
        </span>
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="min-h-9 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:bg-paper"
      >
        Se déconnecter
      </button>
    </div>
  )
}

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 items-center justify-center rounded-xl bg-accent text-surface"
    >
      <LayersIcon className="size-5" />
    </span>
  )
}

const APP_TITLE = 'Tuteur de mathématiques — TCS'

/**
 * A client-side route change neither reloads the page nor moves focus, so keyboard and screen
 * reader users would stay on the clicked link. Move focus to the new content and retitle the tab.
 */
function useRouteFocus() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const lastPathname = useRef(pathname)

  useEffect(() => {
    const label = NAV_ITEMS.find((item) => item.to === pathname)?.label
    document.title = label ? `${label} — ${APP_TITLE}` : APP_TITLE
    // Comparing paths (not a first-render flag) keeps StrictMode's double effect from focusing.
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    mainRef.current?.focus()
  }, [pathname])

  return mainRef
}

export function AppShell() {
  const mainRef = useRouteFocus()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>

      <aside className="border-b border-line bg-surface lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7">
          <BrandMark />
          <div>
            <p className="font-serif text-xl leading-none text-ink">AI Maths</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">
              TCS · Option française
            </p>
          </div>
        </div>

        <nav aria-label="Navigation principale" className="px-3 pb-4 lg:px-4">
          <ul className="grid grid-cols-2 gap-1 lg:flex lg:flex-col">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <li key={to} className="min-w-0 lg:w-full">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    [
                      'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted hover:bg-paper hover:text-ink',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={[
                          'size-1.5 shrink-0 rounded-full',
                          isActive ? 'bg-accent' : 'bg-transparent',
                        ].join(' ')}
                      />
                      <Icon className="size-5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden border-t border-line px-6 py-5 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Démo académique
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Données synthétiques, crédits d’essai. Aucun élève réel dans cette version.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="border-b border-line bg-surface px-5 py-3 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Tronc commun scientifique
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {/* Visible at every width: the sidebar note is hidden on small screens. */}
              <p
                data-testid="demo-label"
                className="rounded-full border border-warm/25 bg-warm-soft px-3 py-1 text-xs font-semibold text-warm"
              >
                Démo v0.1.0 · données synthétiques
              </p>
              <ProfileBadge />
            </div>
          </div>
        </div>
        <OfflineBanner />

        {/* tabIndex -1: the skip link and route changes can focus it; it is not a Tab stop. */}
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 px-5 py-8 focus:outline-none lg:px-10 lg:py-12"
        >
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
