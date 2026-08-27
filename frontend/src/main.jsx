import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter active le routage côté client pour toute l'app. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
