import { useRef, useState, useCallback } from 'react'

// ─── Constantes del gesto ─────────────────────────────────────────────────────
const THRESHOLD     = 80  // px: distancia mínima para disparar el refresh
const MAX_PULL      = 100 // px: máximo desplazamiento visual del contenido
const SETTLE_HEIGHT = 52  // px: altura en que se detiene mientras carga

// ─── SVG: flecha apuntando hacia abajo ────────────────────────────────────────
function ArrowIcon({ progress }) {
  // progress: 0→1 mientras el usuario arrastra hasta el umbral.
  // Rotamos 0° (arriba) → 180° (abajo) para dar feedback visual de tensión.
  const rotation = Math.min(progress, 1) * 180
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6 text-primary transition-none"
      style={{ transform: `rotate(${rotation}deg)`, color: '#15334e' }}
    >
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  )
}

// ─── SVG: spinner de carga ────────────────────────────────────────────────────
function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#15334e"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="w-6 h-6 animate-spin"
    >
      <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
      <path d="M12 3a9 9 0 0 1 9 9" />
    </svg>
  )
}

// ─── PullToRefresh ────────────────────────────────────────────────────────────
/**
 * Wrapper de pull-to-refresh estético para páginas individuales.
 *
 * Props:
 *   onRefresh  {() => Promise<any>}  Función async que se ejecuta al soltar
 *                                    por encima del umbral. DEBE devolver una
 *                                    Promise — PullToRefresh la awaita para
 *                                    saber cuándo volver a la posición 0.
 *   children   {ReactNode}           Contenido de la página a envolver.
 *
 * Cómo funciona:
 *   1. Detecta touchstart en el contenedor scroll cuando scrollTop === 0.
 *   2. En touchmove calcula el delta Y y traslada el contenido hacia abajo
 *      con transform:translateY(px) — aplica resistencia logarítmica para
 *      que el gesto se sienta natural y no lineal.
 *   3. La flecha rota 0→180° a medida que el usuario acerca el umbral.
 *   4. Al soltar (touchend):
 *      - Si no alcanzó el umbral: anima de vuelta a 0px.
 *      - Si lo alcanzó: anima a SETTLE_HEIGHT, muestra spinner, awaita
 *        onRefresh(), luego anima de vuelta a 0px.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullY,      setPullY]      = useState(0)   // px de desplazamiento actual
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAnimating,  setIsAnimating]  = useState(false) // transición de retorno

  const scrollRef   = useRef(null)  // ref al div scrolleable interior
  const startYRef   = useRef(0)     // posición Y del touchstart
  const pullingRef  = useRef(false) // estamos en gesto activo

  // ── Resistencia logarítmica: hace que jalar se sienta con tensión ─────────
  function resistedPull(rawDelta) {
    if (rawDelta <= 0) return 0
    return Math.min(MAX_PULL, rawDelta * (1 - rawDelta / (MAX_PULL * 2.5)))
  }

  // ── touchstart ────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    if (isRefreshing || isAnimating) return
    // Solo iniciar el gesto si el scroll está en el tope
    if (scrollRef.current?.scrollTop !== 0) return
    startYRef.current = e.touches[0].clientY
    pullingRef.current = true
  }, [isRefreshing, isAnimating])

  // ── touchmove ─────────────────────────────────────────────────────────────
  const handleTouchMove = useCallback((e) => {
    if (!pullingRef.current || isRefreshing || isAnimating) return
    // Si el usuario se movió hacia arriba o el scroll ya no está en el tope,
    // cancelar el gesto de pull
    if (scrollRef.current?.scrollTop > 0) {
      pullingRef.current = false
      setPullY(0)
      return
    }

    const deltaY = e.touches[0].clientY - startYRef.current
    if (deltaY <= 0) {
      // Scroll hacia arriba normal — no interferir
      setPullY(0)
      return
    }

    // Calcular desplazamiento con resistencia y actualizar estado
    const py = resistedPull(deltaY)
    setPullY(py)
  }, [isRefreshing, isAnimating])

  // ── touchend ──────────────────────────────────────────────────────────────
  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false

    if (pullY < THRESHOLD) {
      // No llegó al umbral: animar retorno a 0
      setIsAnimating(true)
      setPullY(0)
      setTimeout(() => setIsAnimating(false), 300)
      return
    }

    // Llegó al umbral: iniciar refresh
    setIsRefreshing(true)
    setIsAnimating(true)
    setPullY(SETTLE_HEIGHT)
    setTimeout(() => setIsAnimating(false), 300)

    try {
      await onRefresh()
    } catch (err) {
      console.error('[PullToRefresh] onRefresh error:', err)
    }

    // Animar retorno a 0 al terminar
    setIsAnimating(true)
    setPullY(0)
    setTimeout(() => {
      setIsRefreshing(false)
      setIsAnimating(false)
    }, 350)
  }, [pullY, onRefresh])

  // ── Indicador visual ──────────────────────────────────────────────────────
  // Solo visible cuando hay algún desplazamiento activo
  const indicatorOpacity = Math.min(pullY / THRESHOLD, 1)
  const pullProgress     = pullY / THRESHOLD // 0→1 para la rotación de la flecha

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Indicador: flecha / spinner ──────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center justify-end pointer-events-none"
        style={{
          top: 0,
          height: `${SETTLE_HEIGHT}px`,
          opacity: isRefreshing ? 1 : indicatorOpacity,
          transition: isAnimating ? 'opacity 0.3s ease' : 'none',
        }}
      >
        {/* Fondo pill */}
        <div className="mb-1.5 w-10 h-10 rounded-full bg-white shadow-md border border-gray-100
                        flex items-center justify-center">
          {isRefreshing
            ? <SpinnerIcon />
            : <ArrowIcon progress={pullProgress} />
          }
        </div>
        {!isRefreshing && pullY >= THRESHOLD && (
          <span className="text-[10px] font-semibold text-primary mb-1"
                style={{ color: '#15334e' }}>
            Suelta para actualizar
          </span>
        )}
        {!isRefreshing && pullY > 0 && pullY < THRESHOLD && (
          <span className="text-[10px] font-medium text-gray-400 mb-1">
            Jala para actualizar
          </span>
        )}
      </div>

      {/* ── Contenido de la página ────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="w-full h-full overflow-y-auto"
        style={{
          transform:  `translateY(${pullY}px)`,
          transition: isAnimating ? 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}