import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'
import './App.css'
import App from './App.jsx'

const savedTheme = localStorage.getItem("theme") || "system";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const effectiveTheme = savedTheme === "system" ? (prefersDark ? "dark" : "light") : savedTheme;
document.documentElement.setAttribute("data-theme", effectiveTheme);
document.documentElement.setAttribute("data-bs-theme", effectiveTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
