import { useState } from 'react'
import { useAuth } from './hooks/useAuth.jsx'
import { LoginRegisterView, OnboardingView } from './pages/AuthPage.jsx'
import VentasPage     from './pages/VentasPage.jsx'
import InventarioPage from './pages/InventarioPage.jsx'
import ClubesPage     from './pages/ClubesPage.jsx'
import BottomNav      from './components/layout/BottomNav.jsx'
import Header         from './components/layout/Header.jsx'

// ─── Pantalla de carga ────────────────────────────────────────────────────────
// Se muestra mientras useAuth.ready === false.
// Nunca se ve en usuarios con sesión activa porque getSession()
// lee el caché local de Supabase (<50ms) y fetchProfile termina
// antes de que el browser pinte el primer frame.
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

// ─── App principal ────────────────────────────────────────────────────────────
function MainApp({ userId, fullName, isAdmin }) {
  const [activeTab, setActiveTab] = useState('ventas')
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

// ─── Árbol de decisión (sin parpadeo posible) ─────────────────────────────────
//
//  loading = true   → SplashScreen  (boot en curso, NUNCA muestra login/onboarding)
//  !session         → LoginRegisterView
//  needsOnboarding  → OnboardingView  (SOLO si ready=true y full_name vacío)
//  else             → MainApp
//
// La clave: needsOnboarding en useAuth solo es true DESPUÉS de que
// session + profile están completamente resueltos (ready = true).
export default function App() {
  const { session, user, fullName, isAdmin, loading, needsOnboarding } = useAuth()

  if (loading)         return <SplashScreen />
  if (!session)        return <LoginRegisterView />
  if (needsOnboarding) return <OnboardingView />
  return <MainApp userId={user.id} fullName={fullName} isAdmin={isAdmin} />
}