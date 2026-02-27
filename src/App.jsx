import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import VentasPage from './pages/VentasPage'
import InventarioPage from './pages/InventarioPage'
import ClubesPage from './pages/ClubesPage'
import BottomNav from './components/layout/BottomNav'
import Header from './components/layout/Header'

export default function App() {
  const { session, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('ventas')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark to-primary">
        <div className="text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold">A</span>
          </div>
          <p className="text-blue-200 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!session) return <AuthPage />

  const userId = session.user.id

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header activeTab={activeTab} />

      {/* Contenido principal con espacio para bottom nav */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto px-4 py-4">
          {activeTab === 'ventas'     && <VentasPage     userId={userId} />}
          {activeTab === 'inventario' && <InventarioPage />}
          {activeTab === 'clubes'     && <ClubesPage     userId={userId} />}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}