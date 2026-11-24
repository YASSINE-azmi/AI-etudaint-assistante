import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import { missingEnvVars } from './lib/env'
import { SetupRequiredPage } from './pages/SetupRequiredPage'
import './index.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

const missing = missingEnvVars()

createRoot(root).render(
  <StrictMode>
    {missing.length > 0 ? (
      <SetupRequiredPage missing={missing} />
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)
