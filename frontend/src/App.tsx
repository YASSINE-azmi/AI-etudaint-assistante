import { Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { ClassroomPage } from '@/pages/ClassroomPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PracticePage } from '@/pages/PracticePage'
import { StudyPlanPage } from '@/pages/StudyPlanPage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ClassroomPage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="study-plan" element={<StudyPlanPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
