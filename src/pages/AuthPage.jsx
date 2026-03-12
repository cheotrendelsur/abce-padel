import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import toast from 'react-hot-toast'

// ─── Mapeo de errores de Supabase a mensajes en español ──────────────────────
const ERROR_MSGS = {
  'Invalid login credentials':                'Email o contraseña incorrectos.',
  'User already registered':                  'Ya existe una cuenta con ese email.',
  'Password should be at least 6 characters': 'La contraseña debe tener mínimo 6 caracteres.',
  'Email not confirmed':                      'Confirma tu correo antes de entrar.',
}

// ─── Vista de Login / Registro ────────────────────────────────────────────────
// Flujo idéntico al de Family Market:
//   - Un solo formulario que alterna entre login y registro
//   - signIn/signUp delegan al contexto (no llaman a supabase directamente)
//   - La redirección la maneja App.jsx vía el estado del contexto
export function LoginRegisterView() {
  const { signIn, signUp } = useAuth()
  const [mode,     setMode]    = useState('login') // 'login' | 'register'
  const [email,    setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // Confirmación de registro (igual que Family Market)
    if (mode === 'register') {
      const ok = window.confirm(
        `¿Estás seguro de que deseas crear una nueva cuenta con el correo:\n${email}?`
      )
      if (!ok) return
    }

    setLoading(true)
    // success = true means auth is transitioning → keep spinner until unmount
    let success = false

    try {
      if (mode === 'login') {
        // Wipe any existing or stale session before authenticating.
        // Equivalent to a full manual logout — clears localStorage and
        // invalidates the server-side token before issuing a new one.
        await supabase.auth.signOut({ scope: 'local' })
        const { error: err } = await signIn(email, password)
        if (err) throw err
        // SIGNED_IN en useAuth → estado actualizado → App.jsx redirige solo
        success = true

      } else {
        const { data, error: err } = await signUp(email, password)
        if (err) throw err

        if (!data.session) {
          // Confirmación de email activa en Supabase
          toast.success('¡Cuenta creada! Revisa tu email para confirmar tu cuenta.')
          setEmail('')
          setPassword('')
          setMode('login')
          return
        }
        // Confirmación OFF: SIGNED_IN llega → App muestra Onboarding
        success = true
        toast.success('¡Cuenta creada! Completa tu perfil.')
      }
    } catch (err) {
      setError(ERROR_MSGS[err.message] ?? err.message)
    } finally {
      // Solo resetear spinner si nos quedamos en esta pantalla (error o email-confirm)
      if (!success) setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setEmail('')
    setPassword('')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/icon-192.png" alt="Venta Track Logo" className="w-22 h-22 mx-auto mb-5 drop-shadow-xl rounded-3xl" />
          <h1 className="text-white text-2xl font-bold tracking-tight">Track</h1>
          <p className="text-bone/80 text-sm mt-1">Portal de Ventas</p>
        </div>

        {/* Tarjeta */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Tabs de modo */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'login',    label: 'Iniciar sesión' },
              { id: 'register', label: 'Crear cuenta'   },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchMode(tab.id)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors
                  ${mode === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-400 hover:text-gray-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder:text-gray-300 transition"
                style={{ fontSize: '16px' }} // evita zoom en iOS
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder:text-gray-300 transition"
                style={{ fontSize: '16px' }} // evita zoom en iOS
              />
              {mode === 'register' && (
                <p className="text-xs text-gray-400 mt-1.5">Mínimo 6 caracteres</p>
              )}
            </div>

            {/* Error en línea (mismo patrón visual que Family Market) */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-light active:bg-primary-dark
                         text-white font-semibold py-3 rounded-xl text-sm transition
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-md shadow-primary/20 mt-2"
            >
              {loading
                ? (mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...')
                : (mode === 'login' ? 'Entrar' : 'Crear mi cuenta')
              }
            </button>
          </form>
        </div>

        <p className="text-center text-bone/60 text-xs mt-6">
          Track © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

// ─── Vista de Onboarding (captura de nombre) ─────────────────────────────────
// Equivalente a UsernameSetup de Family Market, pero integrado en AuthPage
// para no necesitar React Router en [Track].
export function OnboardingView() {
  const { user, signOut, refreshProfile } = useAuth()
  const [nombre,     setNombre]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = nombre.trim()
    if (!trimmed || trimmed.length < 3) {
      toast.error('Escribe tu nombre completo (mínimo 3 caracteres)')
      return
    }

    setLoading(true)
    try {
      // UPSERT cubre el caso en que el trigger de Supabase no creó la fila
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, full_name: trimmed, is_admin: false },
          { onConflict: 'id' }
        )
      if (error) throw error

      toast.success(`¡Bienvenido, ${trimmed}!`)

      // refreshProfile actualiza profile en el contexto →
      // needsOnboarding pasa a false → App.jsx renderiza MainApp
      await refreshProfile()

    } catch (err) {
      toast.error(err.message)
      setLoading(false) // solo si falla; si sale bien este componente se desmonta
    }
    // NO hay finally con setLoading(false): si todo salió bien, App.jsx
    // desmonta este componente y llamar setLoading en un componente desmontado
    // puede congelar el estado antes de que React haga el swap de pantalla.
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut() // usa el método del contexto, igual que Family Market
      // SIGNED_OUT en useAuth → user=null → App.jsx renderiza LoginRegisterView
    } catch {
      toast.error('Error al cerrar sesión')
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/icon-192.png" alt="Venta Track Logo" className="w-22 h-22 mx-auto mb-5 drop-shadow-xl rounded-3xl" />
          <h1 className="text-white text-2xl font-bold">¡Bienvenido!</h1>
          <p className="text-bone/80 text-sm mt-1">{user?.email}</p>
        </div>

        {/* Tarjeta */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">

          <div className="flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="1.8" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>

          <h2 className="text-center font-bold text-gray-900 text-lg mb-1">Un último paso</h2>
          <p className="text-center text-gray-500 text-sm mb-5">
            ¿Cómo te identificarás como vendedor en el sistema?
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Nombre de usuario *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Carlos Martínez"
                style={{ fontSize: '16px' }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder:text-gray-300 transition"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Aparecerá en todas tus ventas registradas.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || signingOut || !nombre.trim()}
              className="w-full bg-primary hover:bg-primary-light text-white font-semibold
                         py-3 rounded-xl text-sm transition disabled:opacity-50
                         disabled:cursor-not-allowed shadow-md shadow-primary/20"
            >
              {loading ? 'Guardando...' : 'Continuar a la app →'}
            </button>
          </form>
        </div>

        {/* Escape para cuenta equivocada */}
        <button
          onClick={handleSignOut}
          disabled={signingOut || loading}
          className="block mx-auto mt-4 text-bone/60 hover:text-bone text-xs
                     transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {signingOut ? 'Cerrando sesión...' : 'No soy yo — cerrar sesión'}
        </button>
      </div>
    </div>
  )
}

export default LoginRegisterView