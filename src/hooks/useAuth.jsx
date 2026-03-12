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

    // Timeout de emergencia: 8s máximo en splash
    const timer = setTimeout(() => {
      safeSet(prev => ({
        session: prev.session === undefined ? null : prev.session,
        profile: prev.profile === undefined ? null : prev.profile,
        ready:   true,
      }))
    }, 8000)

    // Fuente única de verdad: onAuthStateChange
    //
    // INITIAL_SESSION es el evento que Supabase dispara al registrar el listener
    // con la sesión ya validada por el servidor (incluye token refresh si era
    // necesario). Es el único punto donde sabemos con certeza si hay sesión o no.
    //
    // Antes se usaba getSession() para el arranque, pero ese método devuelve
    // el caché local sin esperar la validación del servidor — lo que provocaba
    // que ready=true se disparara con estado incorrecto antes de que la
    // verificación real terminara, causando redirecciones falsas al login.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // INITIAL_SESSION es el boot trigger definitivo.
        // SIGNED_IN maneja logins y registros posteriores al arranque.
        // Ambos tienen la misma lógica: cargar perfil y resolver el estado.
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          const p = await fetchProfile(newSession?.user?.id)
          clearTimeout(timer)
          safeSet(() => ({ session: newSession ?? null, profile: p, ready: true }))
          return
        }

        // TOKEN_REFRESHED: solo actualizar la sesión, el perfil no cambia
        if (event === 'TOKEN_REFRESHED') {
          safeSet(prev => ({ ...prev, session: newSession }))
          return
        }

        // SIGNED_OUT: limpiar todo → App.jsx renderiza LoginRegisterView
        if (event === 'SIGNED_OUT') {
          clearTimeout(timer)
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
    auth.session !== null        &&   // hay sesión (null = sin sesión, nunca undefined aquí)
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
