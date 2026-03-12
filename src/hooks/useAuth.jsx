import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Contexto ─────────────────────────────────────────────────────────────────
const AuthContext = createContext({})

// ─── Hook de consumo (igual que Family Market) ───────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}

// ─── fetchProfile: función pura fuera del componente ─────────────────────────
// Fuera del componente = nunca se recrea en cada render, sin stale closures.
// Usa maybeSingle() en lugar de single() para no lanzar error si la fila
// aún no existe (e.g. trigger de Supabase que no corrió a tiempo).
async function fetchProfile(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, is_admin')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('[AuthContext] Error al obtener perfil:', error)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('[AuthContext] fetchProfile excepción:', e)
    return null
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  // Estado atómico: session + profile se actualizan juntos en un solo setState
  // para que React nunca vea un estado intermedio inconsistente.
  // Esto elimina el parpadeo de la pantalla de Onboarding que ocurría cuando
  // session ya estaba resuelta pero profile todavía era undefined.
  const [authState, setAuthState] = useState({
    user:    undefined, // undefined = boot en curso | null = sin sesión
    profile: undefined, // undefined = boot en curso | null = sin perfil
    loading: true,
  })

  const mountedRef = useRef(true)

  // Actualiza el estado solo si el componente sigue montado (evita memory leaks)
  function safeSet(updater) {
    if (mountedRef.current) setAuthState(updater)
  }

  useEffect(() => {
    mountedRef.current = true

    // Timeout de emergencia: si Supabase no responde en 8s, desbloquear la app
    const timer = setTimeout(() => {
      safeSet(prev => ({
        user:    prev.user    === undefined ? null : prev.user,
        profile: prev.profile === undefined ? null : prev.profile,
        loading: false,
      }))
    }, 8000)

    // ── Fuente única de verdad: onAuthStateChange ─────────────────────────
    //
    // INITIAL_SESSION es el evento que Supabase dispara al registrar el listener
    // con la sesión validada por el servidor. Es el boot trigger definitivo.
    //
    // A diferencia de getSession() (que lee el caché local sin verificar el
    // servidor), INITIAL_SESSION garantiza que la sesión es válida antes de
    // resolver el estado — eliminando redireccionamentos falsos al login en F5.
    //
    // SIGNED_IN maneja logins y registros después del arranque.
    // Ambos eventos siguen la misma lógica: cargar perfil y actualizar estado.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          const profile = await fetchProfile(session?.user?.id)
          clearTimeout(timer)
          // Actualización atómica → un solo render → cero parpadeo
          safeSet(() => ({
            user:    session?.user ?? null,
            profile: profile,
            loading: false,
          }))
          return
        }

        if (event === 'TOKEN_REFRESHED') {
          // Solo actualizar el user del token; el perfil no cambia
          safeSet(prev => ({ ...prev, user: session?.user ?? null }))
          return
        }

        if (event === 'SIGNED_OUT') {
          clearTimeout(timer)
          safeSet(() => ({ user: null, profile: null, loading: false }))
        }
      }
    )

    return () => {
      mountedRef.current = false
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  // ── Métodos de autenticación (mismo patrón que Family Market) ─────────────
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
    // No hay redirección manual: SIGNED_OUT en onAuthStateChange pone
    // user=null → App.jsx detecta !session y renderiza LoginRegisterView
  }

  // ── refreshProfile ────────────────────────────────────────────────────────
  // Llamado por OnboardingView después de guardar el nombre.
  // Solo actualiza profile, sin tocar user ni loading.
  const refreshProfile = async () => {
    if (!authState.user?.id) return
    const profile = await fetchProfile(authState.user.id)
    safeSet(prev => ({ ...prev, profile }))
  }

  // ── needsOnboarding ───────────────────────────────────────────────────────
  // SOLO es true cuando el boot terminó (loading=false) Y el perfil no tiene nombre.
  // Nunca es true durante la carga → imposible el parpadeo de la pantalla de nombre.
  const needsOnboarding =
    !authState.loading          &&
    authState.user  !== null    &&
    authState.user  !== undefined &&
    (
      !authState.profile              ||
      !authState.profile.full_name    ||
      authState.profile.full_name.trim() === ''
    )

  const value = {
    // Exponer 'user' igual que Family Market para compatibilidad con componentes existentes
    user:            authState.user    ?? null,
    profile:         authState.profile ?? null,
    loading:         authState.loading,
    needsOnboarding,
    // Alias para compatibilidad con código existente de ABCE Padel
    session:         authState.user ? { user: authState.user } : null,
    fullName:        authState.profile?.full_name ?? null,
    isAdmin:         authState.profile?.is_admin  ?? false,
    // Métodos
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}