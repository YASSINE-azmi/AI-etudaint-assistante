import { Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { ClassroomPage } from '@/pages/ClassroomPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PracticePage } from '@/pages/PracticePage'
import { SessionPage } from '@/pages/SessionPage'
import { StudyPlanPage } from '@/pages/StudyPlanPage'

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route index element={<ClassroomPage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="study-plan" element={<StudyPlanPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="session/:id" element={<SessionPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
