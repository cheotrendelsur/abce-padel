import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// ─── fetchProfile: función pura fuera del componente ─────────────────────────
// No se recrea en cada render → sin stale closures en useEffect.
async function fetchProfile(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, is_admin')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.warn('[useAuth] fetchProfile error:', error.message)
      return null
    }
    return data ?? null
  } catch (e) {
    console.warn('[useAuth] fetchProfile excepción:', e)
    return null
  }
}

// ─── Estado inicial ───────────────────────────────────────────────────────────
const BOOT_STATE = {
  session: undefined, // undefined = todavía cargando
  profile: undefined, // undefined = todavía cargando
  ready:   false,
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(BOOT_STATE)
  const mountedRef      = useRef(true)

  // Solo actualiza el estado si el componente sigue montado
  function safeSet(updater) {
    if (mountedRef.current) setAuth(updater)
  }

  useEffect(() => {
    mountedRef.current = true

    // ── Timeout de emergencia: 8s máximo en splash ──────────────────────────
    const timer = setTimeout(() => {
      safeSet(prev => ({
        session: prev.session === undefined ? null : prev.session,
        profile: prev.profile === undefined ? null : prev.profile,
        ready:   true,
      }))
    }, 8000)

    // ── PASO 1: Leer sesión existente al arrancar (caché local = <50ms) ─────
    // getSession + fetchProfile se resuelven JUNTOS en un único setState
    // → React nunca ve un estado intermedio → cero parpadeo de Onboarding
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      const p = await fetchProfile(s?.user?.id)
      clearTimeout(timer)
      safeSet(() => ({ session: s ?? null, profile: p, ready: true }))
    })

    // ── PASO 2: Suscribirse a cambios POSTERIORES al arranque ───────────────
    //
    // IMPORTANTE — por qué NO usamos bootDoneRef aquí:
    // React StrictMode desmonta + remonta cada componente en desarrollo.
    // useRef persiste entre remounts, así que si usamos un ref como "ya hice boot"
    // el listener onAuthStateChange nunca se suscribe en el segundo mount (el real),
    // rompiendo completamente la reactividad de login/logout.
    //
    // La solución correcta: siempre suscribirse, e ignorar INITIAL_SESSION
    // (que Supabase dispara al registrar el listener) porque getSession ya lo
    // manejó en el Paso 1.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // INITIAL_SESSION: Supabase lo dispara al registrar el listener.
        // Lo ignoramos porque getSession (Paso 1) ya lo procesó.
        if (event === 'INITIAL_SESSION') return

        // TOKEN_REFRESHED: solo actualizar la sesión, el perfil no cambia
        if (event === 'TOKEN_REFRESHED') {
          safeSet(prev => ({ ...prev, session: newSession }))
          return
        }

        // SIGNED_IN: login exitoso o registro con confirmación OFF
        // Cargamos sesión + perfil en un solo setState → sin parpadeo
        if (event === 'SIGNED_IN') {
          const p = await fetchProfile(newSession?.user?.id)
          safeSet(() => ({ session: newSession, profile: p, ready: true }))
        }

        // SIGNED_OUT: limpiar todo → App.jsx renderiza LoginRegisterView
        if (event === 'SIGNED_OUT') {
          safeSet(() => ({ session: null, profile: null, ready: true }))
        }
      }
    )

    return () => {
      mountedRef.current = false
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── refreshProfile ──────────────────────────────────────────────────────────
  // Llamado por OnboardingView después de guardar el nombre.
  // Actualiza solo el profile sin tocar session ni ready.
  async function refreshProfile() {
    const { data: { session: s } } = await supabase.auth.getSession()
    const p = await fetchProfile(s?.user?.id)
    safeSet(prev => ({ ...prev, profile: p }))
  }

  // ── Estado derivado ─────────────────────────────────────────────────────────
  // loading: true mientras ready sea false (boot en curso)
  const loading = !auth.ready

  // needsOnboarding: SOLO true cuando todo está resuelto Y no hay nombre
  // Nunca es true durante la carga → imposible el parpadeo de la pantalla de nombre
  const needsOnboarding =
    auth.ready                   &&   // boot terminado
    auth.session !== null        &&   // hay sesión
    auth.session !== undefined   &&   // (no en boot)
    (
      !auth.profile              ||   // fila no existe (trigger falló)
      !auth.profile.full_name    ||   // full_name es null
      auth.profile.full_name.trim() === '' // full_name es string vacío
    )

  return (
    <AuthContext.Provider value={{
      session:         auth.session   ?? null,
      user:            auth.session?.user    ?? null,
      profile:         auth.profile   ?? null,
      fullName:        auth.profile?.full_name  ?? null,
      isAdmin:         auth.profile?.is_admin   ?? false,
      loading,
      needsOnboarding,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook de consumo ──────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}