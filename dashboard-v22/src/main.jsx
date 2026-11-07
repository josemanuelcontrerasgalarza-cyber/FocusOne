import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Base tokens first so component styles can override them.
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
