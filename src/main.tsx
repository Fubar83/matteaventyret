import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/800.css'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// The game is cached to work offline. When a new version has been put out, the page
// reloads into it at once - otherwise a phone kept showing the old one until it was
// opened a second time.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
