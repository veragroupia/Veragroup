import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CONFIG_FALTANDO } from './lib/supabase'
import { ConfigAusente, LimiteDeErro } from './components/Falha'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LimiteDeErro>
      {CONFIG_FALTANDO.length ? <ConfigAusente faltando={CONFIG_FALTANDO} /> : (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )}
    </LimiteDeErro>
  </StrictMode>,
)
