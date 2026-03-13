import { useRef, useState, useEffect, useCallback } from 'react'

// ─── Constantes del gesto ─────────────────────────────────────────────────────
const THRESHOLD     = 130   // px: distancia mínima para disparar el refresh
const MAX_PULL      = 180   // px: techo del desplazamiento visual
const SETTLE_HEIGHT = 64    // px: posición de reposo mientras gira el spinner

// ─── Curvas de animación ──────────────────────────────────────────────────────
const EASE_BACK   = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
const EASE_SETTLE = 'transform 0.22s cubic-bezier(0.25, 0.8, 0.25, 1)'

// ─── Geometría del anillo SVG ─────────────────────────────────────────────────
// viewBox 32×32 · centro (16,16) · radio 11 · strokeWidth 2.5
// Margen efectivo: 16 - 11 - 1.25 = 3.75px  → el stroke no se corta.
const RING_R            = 11
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R  // ≈ 69.115

// ─── Resistencia al arrastre ──────────────────────────────────────────────────
// f(x) = x · (1 − x / (MAX·2))   lineal al inicio, frenado progresivo.
// Nunca supera MAX_PULL.
function resist(raw) {
  if (raw <= 0) return 0
  return Math.min(MAX_PULL, Math.max(0, raw * (1 - raw / (MAX_PULL * 2))))
}

// ─── ProgressRing ─────────────────────────────────────────────────────────────
/**
 * Anillo SVG que se "llena" con stroke-dashoffset a medida que progress (0→1)
 * aumenta.  Cuando isSpinning=true rota indefinidamente con CSS animation.
 *
 * Truco de orientación: el stroke arranca en las 12 en punto porque aplicamos
 * `rotate(-90deg)` al círculo, que por defecto empieza a las 3 en punto.
 */
function ProgressRing({ progress, isSpinning }) {
  // stroke-dashoffset: circumference cuando vacío → 0 cuando lleno
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(progress, 1))

  return (
    <svg
      viewBox="0 0 32 32"
      className="w-8 h-8"
      style={isSpinning ? { animation: 'ptr-spin 0.9s linear infinite' } : undefined}
    >
      {/* Track: anillo tenue siempre visible como guía */}
      <circle
        cx="16" cy="16" r={RING_R}
        fill="none"
        stroke="#15334e"
        strokeOpacity="0.12"
        strokeWidth="2.5"
      />

      {/* Arco activo: se llena según progress */}
      <circle
        cx="16" cy="16" r={RING_R}
        fill="none"
        stroke="#15334e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
        strokeDashoffset={offset}
        // Arrancar el trazo desde las 12 en punto
        style={{
          transform:       'rotate(-90deg)',
          transformOrigin: '50% 50%',
          // Transición solo cuando el usuario está jalando (no durante spin)
          transition: isSpinning ? 'none' : 'stroke-dashoffset 0.05s linear',
        }}
      />
    </svg>
  )
}

// ─── PullToRefresh ────────────────────────────────────────────────────────────
/**
 * Wrapper de pull-to-refresh estético.
 *
 * ARQUITECTURA:
 *   No introduce un nuevo contenedor de scroll. El scroll lo sigue haciendo
 *   el <main> de App.jsx. Este componente únicamente intercepta el gesto
 *   táctil cuando scrollParent.scrollTop === 0 y desplaza el contenido con
 *   translateY para el efecto visual.
 *
 *   Los listeners se registran con addEventListener nativo para poder usar
 *   { passive: false } en touchmove y llamar preventDefault() — bloqueando
 *   el scroll del padre sólo mientras el usuario arrastra hacia abajo desde
 *   el tope.
 *
 * Props:
 *   onRefresh  {() => Promise<any>}  Se ejecuta al soltar pasado el umbral.
 *   children   {ReactNode}
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullY,        setPullY]        = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const wrapperRef      = useRef(null)
  const contentRef      = useRef(null)
  const startYRef       = useRef(0)
  const currentPullRef  = useRef(0)    // espejo mutable de pullY sin re-renders
  const isPullingRef    = useRef(false)
  const isRefreshingRef = useRef(false) // espejo mutable de isRefreshing

  useEffect(() => { isRefreshingRef.current = isRefreshing }, [isRefreshing])

  // ── animateTo ─────────────────────────────────────────────────────────────
  // Mueve contentRef con transición CSS y devuelve Promise que resuelve
  // cuando termina transitionend (con fallback de 520ms).
  const animateTo = useCallback((targetY, curve) => {
    return new Promise(resolve => {
      const el = contentRef.current
      if (!el) { resolve(); return }

      if (currentPullRef.current === targetY) {
        el.style.transition = 'none'
        el.style.transform  = `translateY(${targetY}px)`
        resolve()
        return
      }

      el.style.transition = curve
      el.style.transform  = `translateY(${targetY}px)`
      currentPullRef.current = targetY

      const done = () => {
        el.removeEventListener('transitionend', done)
        clearTimeout(guard)
        resolve()
      }
      const guard = setTimeout(done, 520)
      el.addEventListener('transitionend', done)
    })
  }, [])

  // ── setRaw ────────────────────────────────────────────────────────────────
  // Mueve contentRef sin transición — sigue el dedo en tiempo real.
  const setRaw = useCallback((y) => {
    const el = contentRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform  = `translateY(${y}px)`
    currentPullRef.current = y
  }, [])

  // ── getScrollParent ───────────────────────────────────────────────────────
  function getScrollParent(el) {
    while (el && el !== document.documentElement) {
      const { overflowY } = window.getComputedStyle(el)
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight)
        return el
      el = el.parentElement
    }
    return document.documentElement
  }

  // ── Listeners nativos ─────────────────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    function onTouchStart(e) {
      if (isRefreshingRef.current) return
      if (getScrollParent(wrapper).scrollTop !== 0) return
      startYRef.current  = e.touches[0].clientY
      isPullingRef.current = true
    }

    function onTouchMove(e) {
      if (!isPullingRef.current || isRefreshingRef.current) return

      if (getScrollParent(wrapper).scrollTop > 0) {
        isPullingRef.current = false
        setRaw(0); setPullY(0)
        return
      }

      const delta = e.touches[0].clientY - startYRef.current
      if (delta <= 0) {
        if (currentPullRef.current !== 0) { setRaw(0); setPullY(0) }
        return
      }

      e.preventDefault()   // bloquea scroll nativo del padre

      const y = resist(delta)
      setRaw(y)
      setPullY(y)
    }

    async function onTouchEnd() {
      if (!isPullingRef.current) return
      isPullingRef.current = false

      const snap = currentPullRef.current

      // No llegó al umbral: rebote suave a 0
      if (snap < THRESHOLD) {
        await animateTo(0, EASE_BACK)
        setPullY(0)
        return
      }

      // ── Secuencia de refresh ──────────────────────────────────────────
      setIsRefreshing(true)
      isRefreshingRef.current = true

      // 1. Asentar en SETTLE_HEIGHT con transición rápida
      await animateTo(SETTLE_HEIGHT, EASE_SETTLE)
      setPullY(SETTLE_HEIGHT)

      // 2. Ejecutar el fetch
      try { await onRefresh() }
      catch (err) { console.error('[PullToRefresh] onRefresh error:', err) }

      // 3. Retorno suave a 0
      await animateTo(0, EASE_BACK)
      setPullY(0)
      setIsRefreshing(false)
      isRefreshingRef.current = false
    }

    wrapper.addEventListener('touchstart', onTouchStart, { passive: true  })
    wrapper.addEventListener('touchmove',  onTouchMove,  { passive: false })
    wrapper.addEventListener('touchend',   onTouchEnd,   { passive: true  })

    return () => {
      wrapper.removeEventListener('touchstart', onTouchStart)
      wrapper.removeEventListener('touchmove',  onTouchMove)
      wrapper.removeEventListener('touchend',   onTouchEnd)
    }
  }, [animateTo, setRaw, onRefresh])

  // ── Valores derivados ─────────────────────────────────────────────────────
  // progress 0→1 para el anillo y la opacidad del indicador
  const progress = Math.min(pullY / THRESHOLD, 1)

  // El indicador aparece suavemente a partir del 20% del umbral
  // y llega a opacidad 1 en el 60%.
  const opacity = isRefreshing
    ? 1
    : Math.min((pullY / (THRESHOLD * 0.6)), 1)

  // Escala: empieza pequeño (0.5) y crece hasta 1 al llegar al umbral
  const scale = 0.5 + progress * 0.5

  return (
    <>
      {/* Keyframe de spin inyectado una sola vez en el <head> */}
      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Wrapper externo: captura todos los toques */}
      <div
        ref={wrapperRef}
        className="relative w-full min-h-full"
        style={{ touchAction: 'pan-y' }}
      >
        {/* ── Indicador ───────────────────────────────────────────────── */}
        {/* Posicionado absolutamente en el tope, detrás del contenido.
            El contenido se desplaza hacia abajo con translateY y lo revela. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 flex items-end justify-center pointer-events-none"
          style={{
            height:     `${SETTLE_HEIGHT}px`,
            opacity,
            transition: isRefreshing ? 'opacity 0.25s ease' : 'none',
          }}
        >
          {/* Pastilla circular blanca */}
          <div
            className="mb-2 rounded-full bg-white shadow-md flex items-center justify-center"
            style={{
              width:      '40px',
              height:     '40px',
              transform:  `scale(${scale})`,
              // La escala solo se transiciona al terminar (durante el gesto
              // sigue el dedo sin interpolación para sensación inmediata)
              transition: isRefreshing ? 'transform 0.2s ease' : 'none',
            }}
          >
            <ProgressRing progress={progress} isSpinning={isRefreshing} />
          </div>
        </div>

        {/* ── Contenido ───────────────────────────────────────────────── */}
        <div ref={contentRef} className="w-full" style={{ willChange: 'transform' }}>
          {children}
        </div>
      </div>
    </>
  )
}