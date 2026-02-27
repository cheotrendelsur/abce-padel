/**
 * App.jsx — Punto de entrada de la aplicación ABCE Padel
 *
 * Árbol de decisión para renderizado:
 *
 *  loading === true
 *    └─ <SplashScreen>               (evita flash de contenido incorrecto)
 *
 *  !session
 *    └─ <LoginRegisterView>          (no hay sesión activa)
 *
 *  session && fullName === null
 *    └─ <OnboardingView>             (primer ingreso, nombre pendiente)
 *
 *  session && fullName !== null
 *    └─ App principal                (vendedor autenticado y configurado)
 *         ├─ <Header>
 *         ├─ <VentasPage>
 *         ├─ <InventarioPage>
 *         ├─ <ClubesPage>
 *         └─ <BottomNav>
 */

import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginRegisterView, OnboardingView } from './pages/AuthPage'
import VentasPage     from './pages/VentasPage'
import InventarioPage from './pages/InventarioPage'
import ClubesPage     from './pages/ClubesPage'
import BottomNav      from './components/layout/BottomNav'
import Header         from './components/layout/Header'

// ─── Pantalla de carga inicial ───────────────────────────────────────────────
function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#1a56db]">
      <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center shadow-xl animate-pulse">
        <span className="text-white text-4xl font-black">A</span>
      </div>
      <p className="text-blue-200 text-sm mt-5 tracking-wide">Cargando...</p>
    </div>
  )
}

// ─── App principal (usuario autenticado y con nombre) ────────────────────────
function MainApp({ userId, fullName, isAdmin }) {
  const [activeTab, setActiveTab] = useState('ventas')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        activeTab={activeTab}
        fullName={fullName}
        isAdmin={isAdmin}
      />

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto px-4 py-4">
          {activeTab === 'ventas'     && <VentasPage     userId={userId} />}
          {activeTab === 'inventario' && <InventarioPage />}
          {activeTab === 'clubes'     && <ClubesPage     userId={userId} />}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

// ─── Componente raíz ─────────────────────────────────────────────────────────
export default function App() {
  const {
    session,
    user,
    fullName,
    isAdmin,
    loading,
    profileLoading,
  } = useAuth()

  // 1. Esperando resolución de sesión inicial (o carga del perfil)
  if (loading || profileLoading) {
    return <SplashScreen />
  }

  // 2. Sin sesión → Login / Registro
  if (!session) {
    return <LoginRegisterView />
  }

  // 3. Sesión activa pero sin nombre → Onboarding obligatorio
  if (fullName === null) {
    return <OnboardingView />
  }

  // 4. Todo en orden → App principal
  return (
    <MainApp
      userId={user.id}
      fullName={fullName}
      isAdmin={isAdmin}
    />
  )
}