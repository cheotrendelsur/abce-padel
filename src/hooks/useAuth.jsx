import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}

// ─── fetchProfile: función pura fuera del componente ─────────────────────────
async function fetchProfile(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, is_admin')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('[useAuth] fetchProfile error:', error.message)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('[useAuth] fetchProfile excepción:', e)
    return null
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user:    undefined, // undefined = boot en curso
    profile: undefined, // undefined = boot en curso
    loading: true,
  })

  const mountedRef  = useRef(true)
  // Previene que getSession y onAuthStateChange corran fetchProfile en paralelo
  // al arrancar — la primera que termina marca el boot como hecho y la segunda
  // no vuelve a poner loading:true ni a disparar otro fetch innecesario.
  const bootDone    = useRef(false)

  function safeSet(updater) {
    if (mountedRef.current) setAuthState(updater)
  }

  useEffect(() => {
    mountedRef.current = true
    bootDone.current   = false

    // ── Timeout de seguridad: si Supabase no responde en 8s, desbloquear ───
    const timer = setTimeout(() => {
      if (!bootDone.current) {
        console.warn('[useAuth] Timeout de seguridad — desbloqueando app')
        bootDone.current = true
        safeSet({ user: null, profile: null, loading: false })
      }
    }, 8000)

    // ── PASO 1: Leer sesión del localStorage de forma explícita ─────────────
    // Esta llamada lee el caché local de Supabase de forma SÍNCRONA en la
    // práctica (<10ms) — garantiza que al recargar la página el usuario ya
    // autenticado no vea el login ni el onboarding.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timer)

      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        bootDone.current = true
        safeSet({ user: session.user, profile, loading: false })
      } else {
        bootDone.current = true
        safeSet({ user: null, profile: null, loading: false })
      }
    }).catch(() => {
      // Si getSession falla por algún error de red/storage, desbloquear igual
      clearTimeout(timer)
      bootDone.current = true
      safeSet({ user: null, profile: null, loading: false })
    })

    // ── PASO 2: Escuchar cambios POSTERIORES al boot ─────────────────────────
    // No filtramos por nombre de evento — respondemos a cualquier cambio
    // en la sesión exactamente igual que Family Market.
    // La guardia `bootDone.current` evita que INITIAL_SESSION (que Supabase
    // dispara al registrar este listener) corra fetchProfile por segunda vez
    // mientras getSession del Paso 1 todavía no terminó.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Durante el boot, getSession ya maneja el estado inicial.
        // Ignorar eventos que lleguen antes de que el boot termine.
        if (!bootDone.current) return

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          safeSet({ user: session.user, profile, loading: false })
        } else {
          safeSet({ user: null, profile: null, loading: false })
        }
      }
    )

    return () => {
      mountedRef.current = false
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  // ── Métodos de autenticación ──────────────────────────────────────────────
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
    // No hay redirección manual: SIGNED_OUT dispara onAuthStateChange →
    // user=null → App.jsx detecta !session y renderiza LoginRegisterView
  }

  // ── refreshProfile ────────────────────────────────────────────────────────
  const refreshProfile = async () => {
    if (!authState.user?.id) return
    const profile = await fetchProfile(authState.user.id)
    safeSet(prev => ({ ...prev, profile }))
  }

  // ── needsOnboarding ───────────────────────────────────────────────────────
  // Solo true cuando el boot terminó Y el perfil no tiene nombre guardado.
  const needsOnboarding =
    !authState.loading           &&
    authState.user  !== null     &&
    authState.user  !== undefined &&
    (
      !authState.profile                       ||
      !authState.profile.full_name             ||
      authState.profile.full_name.trim() === ''
    )

  const value = {
    user:            authState.user    ?? null,
    profile:         authState.profile ?? null,
    loading:         authState.loading,
    needsOnboarding,
    // Alias para compatibilidad con el resto de [Track]
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