/**
 * Header.jsx — Barra superior de la aplicación
 *
 * Muestra el título de la pestaña activa, el nombre del vendedor
 * y un badge de "Admin" si corresponde.
 */
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const TAB_TITLES = {
  ventas:     'Registro de Ventas',
  inventario: 'Inventario',
  clubes:     'Base de Datos de Clubes',
}

export default function Header({ activeTab, fullName, isAdmin }) {
  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
  }

  // Iniciales para el avatar (máx. 2 letras)
  const initials = fullName
    ? fullName.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="bg-[#1a56db] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">

      {/* Izquierda: logo + título */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-sm">A</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-blue-200 leading-none">ABCE Padel</p>
          <p className="font-semibold text-sm leading-tight truncate">
            {TAB_TITLES[activeTab]}
          </p>
        </div>
      </div>

      {/* Derecha: vendedor + botón salir */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Nombre del vendedor */}
        {fullName && (
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            {isAdmin && (
              <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                Admin
              </span>
            )}
            <span className="text-blue-100 text-xs font-medium">{fullName}</span>
          </div>
        )}

        {/* Avatar con iniciales (visible en móvil) */}
        <div className="sm:hidden w-7 h-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0"
             title={fullName}>
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>

        {/* Botón cerrar sesión */}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="text-blue-200 hover:text-white transition flex items-center gap-1 text-xs"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  )
}