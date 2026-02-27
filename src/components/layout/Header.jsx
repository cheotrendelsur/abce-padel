import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const TAB_TITLES = {
  ventas: 'Registro de Ventas',
  inventario: 'Inventario',
  clubes: 'Base de Datos de Clubes',
}

export default function Header({ activeTab }) {
  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
  }

  return (
    <header className="bg-primary text-white px-4 pt-safe-top py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="font-bold text-sm">A</span>
        </div>
        <div>
          <p className="text-xs text-blue-200 leading-none">ABCE Padel</p>
          <p className="font-semibold text-sm leading-tight">{TAB_TITLES[activeTab]}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="text-blue-200 hover:text-white transition text-xs flex items-center gap-1"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Salir
      </button>
    </header>
  )
}