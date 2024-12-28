import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from "react-router"
import { EventStoreProvider } from './eventstore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <EventStoreProvider>
        <App />
      </EventStoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
