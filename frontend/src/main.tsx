import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/sections/primitives.css'

// Gates the scroll-reveal start state in base.css. Without JS the class is never
// added, so revealed sections stay visible instead of stuck at opacity 0.
document.documentElement.classList.add('js')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
