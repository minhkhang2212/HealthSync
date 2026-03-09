import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const appNode = <App />;

createRoot(document.getElementById('root')).render(
  import.meta.env.DEV ? appNode : <StrictMode>{appNode}</StrictMode>,
)
