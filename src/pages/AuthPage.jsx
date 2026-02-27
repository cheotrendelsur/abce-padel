/**
 * AuthPage.jsx
 *
 * Contiene dos vistas en un mismo archivo:
 *
 *  1. <LoginRegisterView>  — Formulario de email + contraseña para iniciar sesión
 *                            o crear cuenta. Se muestra cuando NO hay sesión activa.
 *
 *  2. <OnboardingView>     — Pantalla de "completar nombre" que bloquea el acceso
 *                            a la app cuando el usuario es nuevo (full_name === null).
 *                            Al guardar, llama a refreshProfile() para desbloquear.
 *
 * App.jsx decide cuál renderizar según el estado del hook useAuth.
 */

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

// ─── Pantalla de Login / Registro ────────────────────────────────────────────
export function LoginRegisterView() {
  const [mode,     setMode]     = useState('login') // 'login' | 'register'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // onAuthStateChange en useAuth.js se encarga de cargar el perfil
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // El trigger de Supabase creará el perfil con full_name = null
        // App.jsx redirigirá al onboarding automáticamente
        toast.success('¡Cuenta creada! Ahora dinos tu nombre.')
      }
    } catch (err) {
      // Mensajes de error más amigables
      const msgs = {
        'Invalid login credentials':        'Email o contraseña incorrectos.',
        'User already registered':          'Ya existe una cuenta con ese email.',
        'Password should be at least 6 characters': 'La contraseña debe tener mínimo 6 caracteres.',
      }
      toast.error(msgs[err.message] ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] to-[#1a56db] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-3xl mb-5 shadow-xl">
            <span className="text-white text-4xl font-black tracking-tight">A</span>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">ABCE Padel</h1>
          <p className="text-blue-200 text-sm mt-1">Portal de Ventas</p>
        </div>

        {/* Tarjeta */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Tabs Login / Registro */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'login',    label: 'Iniciar sesión' },
              { id: 'register', label: 'Crear cuenta'   },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors
                  ${mode === tab.id
                    ? 'text-[#1a56db] border-b-2 border-[#1a56db]'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent
                           placeholder:text-gray-300 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent
                           placeholder:text-gray-300 transition"
              />
              {mode === 'register' && (
                <p className="text-xs text-gray-400 mt-1.5">Mínimo 6 caracteres</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a56db] hover:bg-[#1e40af] active:bg-[#1e3a8a]
                         text-white font-semibold py-3 rounded-xl text-sm transition
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-md shadow-blue-200 mt-2"
            >
              {loading
                ? 'Un momento...'
                : mode === 'login' ? 'Entrar' : 'Crear mi cuenta'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          ABCE Padel © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

// ─── Pantalla de Onboarding (completar nombre) ───────────────────────────────
export function OnboardingView() {
  const { user, refreshProfile } = useAuth()
  const [fullName, setFullName]  = useState('')
  const [loading,  setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = fullName.trim()
    if (!trimmed) { toast.error('Por favor escribe tu nombre completo'); return }
    if (trimmed.length < 3) { toast.error('El nombre debe tener al menos 3 caracteres'); return }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', user.id)

      if (error) throw error

      // Recargar el perfil en el contexto → App.jsx verá fullName !== null y entrará a la app
      await refreshProfile()
      toast.success(`¡Bienvenido, ${trimmed}!`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] to-[#1a56db] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-3xl mb-5 shadow-xl">
            <span className="text-white text-4xl font-black">A</span>
          </div>
          <h1 className="text-white text-2xl font-bold">¡Bienvenido!</h1>
          <p className="text-blue-200 text-sm mt-1">Cuenta: {user?.email}</p>
        </div>

        {/* Tarjeta */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">

          {/* Icono decorativo */}
          <div className="flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="1.8" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>

          <h2 className="text-center font-bold text-gray-900 text-lg mb-1">Un último paso</h2>
          <p className="text-center text-gray-500 text-sm mb-5">
            Dinos cómo te identificarás como vendedor en el sistema.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Tu nombre completo *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ej: Carlos Martínez"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent
                           placeholder:text-gray-300 transition"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Este nombre aparecerá en todas tus ventas y no podrás cambiarlo fácilmente.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white font-semibold
                         py-3 rounded-xl text-sm transition disabled:opacity-50
                         disabled:cursor-not-allowed shadow-md shadow-blue-200"
            >
              {loading ? 'Guardando...' : 'Continuar a la app →'}
            </button>
          </form>
        </div>

        {/* Escape: cerrar sesión si se registró por error */}
        <button
          onClick={handleLogout}
          className="block mx-auto mt-4 text-blue-200/60 hover:text-blue-200 text-xs transition"
        >
          No soy yo — cerrar sesión
        </button>
      </div>
    </div>
  )
}

// ─── Export por defecto: solo la vista Login/Registro ────────────────────────
// (el onboarding lo renderiza App.jsx directamente con <OnboardingView />)
export default LoginRegisterView