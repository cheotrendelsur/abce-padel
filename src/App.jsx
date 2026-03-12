import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth.jsx'
import { LoginRegisterView, OnboardingView } from './pages/AuthPage.jsx'
import VentasPage     from './pages/VentasPage.jsx'
import InventarioPage from './pages/InventarioPage.jsx'
import ClubesPage     from './pages/ClubesPage.jsx'
import BottomNav      from './components/layout/BottomNav.jsx'
import Header         from './components/layout/Header.jsx'

// ─── Pantalla de carga ────────────────────────────────────────────────────────
// Se muestra mientras useAuth.ready === false (isInitializing).
// El boot se resuelve cuando Supabase dispara INITIAL_SESSION con la sesión
// validada por el servidor. Hasta ese momento NO se renderiza nada de auth.
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
      <main className="flex-1 overflow-y-auto pb-24 overscroll-y-none">
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

  // Prevent pull-to-refresh on iOS PWA (fallback for iOS < 16 where
  // CSS overscroll-behavior-y may not be fully honored).
  // Only blocks touchmove events that are NOT inside a scrollable child.
  useEffect(() => {
    let startY = 0
    const onTouchStart = (e) => { startY = e.touches[0].clientY }
    const onTouchMove = (e) => {
      if (!e.cancelable) return
      const dy = e.touches[0].clientY - startY
      if (dy <= 0) return // scrolling down — never pull-to-refresh
      // Walk up from the touch target; if a scrollable element with remaining
      // scroll is found, allow the event so internal lists still scroll up.
      let el = e.target
      while (el && el !== document.documentElement) {
        const { overflowY } = window.getComputedStyle(el)
        if ((overflowY === 'auto' || overflowY === 'scroll') &&
            el.scrollHeight > el.clientHeight && el.scrollTop > 0) {
          return
        }
        el = el.parentElement
      }
      e.preventDefault()
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  if (loading)         return <SplashScreen />
  if (!session)        return <LoginRegisterView />
  if (needsOnboarding) return <OnboardingView />
  return <MainApp userId={user.id} fullName={fullName} isAdmin={isAdmin} />
}