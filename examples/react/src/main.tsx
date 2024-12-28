import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from "react-router"
import { EventStoreProvider } from './eventstore'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <EventStoreProvider>
      <App />
    </EventStoreProvider>
  </BrowserRouter>
)
