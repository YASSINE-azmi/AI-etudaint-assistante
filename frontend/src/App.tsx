import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoading } from '@/components/layout/PageLoading'
import { env } from '@/lib/env'
import { LoginPage } from '@/pages/LoginPage'

// Route-level chunks (Week 12): KaTeX and the AI SDK load only with the session page.
const ClassroomPage = lazy(() =>
  import('@/pages/ClassroomPage').then((m) => ({ default: m.ClassroomPage })),
)
const PracticePage = lazy(() =>
  import('@/pages/PracticePage').then((m) => ({ default: m.PracticePage })),
)
const StudyPlanPage = lazy(() =>
  import('@/pages/StudyPlanPage').then((m) => ({ default: m.StudyPlanPage })),
)
const HistoryPage = lazy(() =>
  import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
)
const SessionPage = lazy(() =>
  import('@/pages/SessionPage').then((m) => ({ default: m.SessionPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
const ComponentFixturesPage = lazy(() =>
  import('@/pages/ComponentFixturesPage').then((m) => ({ default: m.ComponentFixturesPage })),
)

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      {env.isDev ? (
        <Route
          path="dev/composants"
          element={
            <Suspense fallback={<PageLoading />}>
              <ComponentFixturesPage />
            </Suspense>
          }
        />
      ) : null}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<ClassroomPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="study-plan" element={<StudyPlanPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="session/:id" element={<SessionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
