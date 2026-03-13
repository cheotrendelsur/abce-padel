import { useState } from 'react'
import { useAuth } from './hooks/useAuth.jsx'
import { LoginRegisterView, OnboardingView } from './pages/AuthPage.jsx'
import VentasPage     from './pages/VentasPage.jsx'
import InventarioPage from './pages/InventarioPage.jsx'
import ClubesPage     from './pages/ClubesPage.jsx'
import BottomNav      from './components/layout/BottomNav.jsx'
import Header         from './components/layout/Header.jsx'

// ─── Splash screen ────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-dark to-primary">
      <img src="/icon-512.png" alt="Venta Track" className="w-32 h-32 mb-4 rounded-xl" />
      <p className="text-bone text-sm mt-1 tracking-wide">Cargando...</p>
    </div>
  )
}

// ─── App principal ────────────────────────────────────────────────────────────
// fixed inset-0 en lugar de min-h-screen coopera con body { position: fixed }
// en index.css — sin esto el layout se rompe en iOS cuando la barra de Safari
// aparece/desaparece al scrollear.
function MainApp({ userId, fullName, isAdmin }) {
  const [activeTab, setActiveTab] = useState('ventas')

  return (
    <div className="fixed inset-0 bg-bone flex flex-col">
      <Header activeTab={activeTab} fullName={fullName} isAdmin={isAdmin} />

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

// ─── Componente raíz ──────────────────────────────────────────────────────────
//
// Árbol de decisión (sin parpadeo posible — ver useAuth.jsx):
//
//   loading = true   → SplashScreen   (boot en curso)
//   !session         → LoginRegisterView
//   needsOnboarding  → OnboardingView  (ready=true Y full_name vacío)
//   else             → MainApp
//
export default function App() {
  const { session, user, fullName, isAdmin, loading, needsOnboarding } = useAuth()

  if (loading)         return <SplashScreen />
  if (!session)        return <LoginRegisterView />
  if (needsOnboarding) return <OnboardingView />
  return <MainApp key={user.id} userId={user.id} fullName={fullName} isAdmin={isAdmin} />
}