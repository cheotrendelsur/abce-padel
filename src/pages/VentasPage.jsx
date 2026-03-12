import { useState } from 'react'
import VentaForm from '../components/ventas/VentaForm'
import HistorialVentas from '../components/ventas/HistorialVentas'

export default function VentasPage({ userId }) {
  const [refreshKey, setRefreshKey] = useState(0)
  // null = selector visible | 'Directa' = formulario abierto
  const [modo, setModo] = useState(null)

  function handleVentaCreada() {
    setRefreshKey(k => k + 1)
    setModo(null) // vuelve al selector tras guardar
  }

  return (
    <div className="space-y-6">

      {/* ── Selector de tipo ─────────────────────────────────────────── */}
      {modo === null && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Registrar nueva venta
          </p>
          <div className="grid grid-cols-2 gap-3">

            {/* Venta Directa */}
            <button
              type="button"
              onClick={() => setModo('Directa')}
              className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl
                         border-2 border-primary bg-primary/5
                         hover:bg-primary/10 active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 2.5 2 2.5-2 3.5 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-bold text-primary text-sm">Venta Directa</p>
                <p className="text-xs text-gray-400 mt-0.5">Pago inmediato</p>
              </div>
            </button>

            {/* Consignación — próximamente */}
            <div className="relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl
                            border-2 border-dashed border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed">
              <span className="absolute -top-2.5 right-3 bg-amber-400 text-white text-[10px]
                               font-bold px-2 py-0.5 rounded-full shadow">
                Próximamente
              </span>
              <div className="w-12 h-12 rounded-xl bg-gray-300 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-400 text-sm">Consignación</p>
                <p className="text-xs text-gray-400 mt-0.5">En desarrollo</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Formulario con botón colapsar ────────────────────────────── */}
      {modo === 'Directa' && (
        <div>
          {/* Botón colapsar */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Venta Directa
            </p>
            <button
              type="button"
              onClick={() => setModo(null)}
              className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200
                         p-2 rounded-xl transition"
              aria-label="Colapsar formulario"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          <VentaForm
            userId={userId}
            tipoInicial="Directa"
            onVentaCreada={handleVentaCreada}
          />
        </div>
      )}

      {/* ── Historial siempre visible ─────────────────────────────────── */}
      <HistorialVentas userId={userId} refreshKey={refreshKey} />
    </div>
  )
}