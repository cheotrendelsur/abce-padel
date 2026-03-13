import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth.jsx'
import { LoginRegisterView, OnboardingView } from './pages/AuthPage.jsx'
import VentasPage     from './pages/VentasPage.jsx'
import InventarioPage from './pages/InventarioPage.jsx'
import ClubesPage     from './pages/ClubesPage.jsx'
import BottomNav      from './components/layout/BottomNav.jsx'
import Header         from './components/layout/Header.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// PULL-TO-REFRESH & OVERSCROLL PREVENTION
//
// Por qué se necesitan AMBAS capas (CSS + JS):
//
//   CSS `overscroll-behavior: none` y `body { position: fixed }` bloquean el
//   rubber-band en el documento. Pero en superficies NO scrolleables (header,
//   BottomNav, fondos de pantalla fija), el navegador sigue disparando el
//   pull-to-refresh nativo a menos que JS llame e.preventDefault() en el
//   touchmove. CSS no puede hacer esto — solo JS puede cancelar eventos activos.
//
// Por qué { passive: false }:
//   Los navegadores modernos registran los listeners de touch como "passive"
//   por defecto (para mejorar el rendimiento del scroll). Esto hace que
//   preventDefault() sea silenciosamente ignorado. Debemos optar por no-pasivo
//   explícitamente para recuperar la capacidad de cancelar el evento.
//
// Por qué canScroll() + isAtBoundary():
//   No queremos bloquear TODO el scroll táctil — solo el overscroll que
//   dispara el pull-to-refresh. La función sube por el DOM desde el elemento
//   tocado. Si encuentra un ancestro scrolleable con contenido que desborda,
//   comprueba además si el scroll está en el límite (tope/fondo). Si está en
//   el límite, bloquea para evitar que el bounce "escape" al documento padre.
//   Si no está en el límite, deja pasar el evento normalmente.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sube por el árbol del DOM desde `el` buscando el primer ancestro
 * que tenga scroll vertical activo (scrollHeight > clientHeight).
 * Devuelve ese elemento, o null si ninguno puede scrollear.
 */
function findScrollableAncestor(el) {
  while (el && el !== document.body) {
    const { overflowY } = window.getComputedStyle(el)
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      return el
    }
    el = el.parentElement
  }
  return null
}

/**
 * Devuelve true si el contenedor scrolleable está en el tope o en el fondo,
 * es decir, si seguir arrastrando haría overscroll hacia el documento padre.
 */
function isAtScrollBoundary(el, deltaY) {
  const atTop    = el.scrollTop <= 0
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1

  // Dragging down en el tope → pull-to-refresh territory
  if (deltaY > 0 && atTop)    return true
  // Dragging up en el fondo → overscroll bounce territory
  if (deltaY < 0 && atBottom) return true

  return false
}

function usePreventOverscroll() {
  useEffect(() => {
    let lastTouchY = 0

    function handleTouchStart(e) {
      // Guardar la posición Y inicial del toque para calcular dirección en touchmove
      if (e.touches.length === 1) {
        lastTouchY = e.touches[0].clientY
      }
    }

    function handleTouchMove(e) {
      // Dejar pasar gestos multi-touch (pinch-zoom, etc.)
      if (e.touches.length > 1) return

      const currentY = e.touches[0].clientY
      const deltaY   = lastTouchY - currentY // positivo = scroll hacia arriba
      lastTouchY     = currentY

      const scrollable = findScrollableAncestor(e.target)

      if (!scrollable) {
        // El toque ocurre en una superficie no scrolleable (header, BottomNav,
        // fondo de pantalla, etc.) → bloquear para evitar pull-to-refresh
        e.preventDefault()
        return
      }

      if (isAtScrollBoundary(scrollable, deltaY)) {
        // El contenedor llegó a su límite — bloquear para que el overscroll
        // no "escape" al documento padre y active el pull-to-refresh
        e.preventDefault()
      }
      // En cualquier otro caso: dejar pasar → scroll normal funciona
    }

    // passive: false es OBLIGATORIO para que preventDefault() tenga efecto
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove',  handleTouchMove,  { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { passive: true })
      document.removeEventListener('touchmove',  handleTouchMove,  { passive: false })
    }
  }, [])
}

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

      {/* Único elemento con scroll en toda la app.
          overflow-y-auto + overscroll-behavior-y: contain (vía CSS en index.css)
          dan momentum scroll nativo en iOS sin disparar pull-to-refresh. */}
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
  // Bloquea el pull-to-refresh nativo del browser en toda la app.
  // Las páginas que lo necesitan (InventarioPage, ClubesPage) usan
  // el componente <PullToRefresh> para un gesto propio y estético.
  usePreventOverscroll()

  const { session, user, fullName, isAdmin, loading, needsOnboarding } = useAuth()

  if (loading)         return <SplashScreen />
  if (!session)        return <LoginRegisterView />
  if (needsOnboarding) return <OnboardingView />
  return <MainApp key={user.id} userId={user.id} fullName={fullName} isAdmin={isAdmin} />
}