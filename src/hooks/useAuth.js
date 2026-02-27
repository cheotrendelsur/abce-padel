/**
 * useAuth — Context Provider de autenticación para ABCE Padel
 *
 * Expone:
 *   session    — objeto de sesión de Supabase (null si no hay sesión)
 *   user       — objeto user de Supabase (null si no hay sesión)
 *   profile    — fila completa de la tabla profiles (null si cargando o sin sesión)
 *   fullName   — string con el nombre del vendedor, o null si es primer ingreso
 *   isAdmin    — boolean, true si el usuario tiene permisos de admin
 *   loading    — true mientras se resuelve la sesión inicial
 *   profileLoading — true mientras se carga el perfil tras autenticarse
 *   refreshProfile — función para recargar el perfil manualmente (útil tras el onboarding)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Contexto ────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [session,        setSession]        = useState(null)
  const [profile,        setProfile]        = useState(null)
  const [loading,        setLoading]        = useState(true)   // sesión inicial
  const [profileLoading, setProfileLoading] = useState(false)  // carga del perfil

  // Cargar el perfil de un usuario dado su ID
  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    setProfileLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, is_admin, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[useAuth] Error cargando perfil:', error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
    setProfileLoading(false)
  }, [])

  // Función pública para recargar el perfil (se llama tras guardar el nombre en onboarding)
  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id)
    }
  }, [session, loadProfile])

  // Efecto principal: escucha cambios de sesión de Supabase
  useEffect(() => {
    // 1. Obtener sesión existente al montar
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session
      setSession(s)
      if (s?.user?.id) {
        loadProfile(s.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // 2. Suscribirse a cambios futuros (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)

        if (event === 'SIGNED_IN' && newSession?.user?.id) {
          await loadProfile(newSession.user.id)
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  // Valores derivados — cómodos para los componentes consumidores
  const value = {
    session,
    user:           session?.user ?? null,
    profile,
    fullName:       profile?.full_name ?? null,       // null = onboarding pendiente
    isAdmin:        profile?.is_admin  ?? false,
    loading,                                          // esperar antes de renderizar
    profileLoading,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook de consumo ─────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}