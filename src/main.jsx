/**
 * main.jsx — Punto de montaje de React
 *
 * IMPORTANTE: <AuthProvider> debe envolver a <App> para que
 * useAuth() funcione en cualquier componente de la jerarquía.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>
)