import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import VentaEditModal from './VentaEditModal'

const MONEDA_SYMBOL = { USD: '$', VES: 'Bs.' }

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function HistorialVentas({ userId, refreshKey }) {
  const [ventas,      setVentas]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [editVenta,   setEditVenta]   = useState(null)

  const fetchVentas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ventas')
      .select(`*, venta_items(cantidad, productos(nombre))`)
      .eq('vendedor_id', userId)
      .order('fecha_venta', { ascending: false })
      .limit(50)

    setVentas(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchVentas() }, [fetchVentas, refreshKey])

  if (loading) return (
    <div className="text-center py-8 text-gray-400 text-sm">Cargando historial...</div>
  )

  if (!ventas.length) return (
    <div className="text-center py-8 text-gray-400 text-sm">Aún no tienes ventas registradas</div>
  )

  return (
    <>
      <h2 className="font-bold text-gray-800 text-base mb-3">Historial de Ventas</h2>
      <div className="space-y-3">
        {ventas.map(v => {
          const sym = MONEDA_SYMBOL[v.moneda] || v.moneda
          return (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{v.nombre_cliente}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmtDate(v.fecha_venta)} · {v.forma_pago}</p>
                </div>
                <button
                  onClick={() => setEditVenta(v)}
                  className="flex-shrink-0 text-xs bg-primary/10 text-primary font-medium px-3 py-1.5 rounded-lg hover:bg-primary/20 transition"
                >
                  Editar
                </button>
              </div>

              {/* Productos */}
              {v.venta_items?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v.venta_items.map((item, i) => (
                    <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {item.productos?.nombre} ×{item.cantidad}
                    </span>
                  ))}
                </div>
              )}

              {/* Montos */}
              <div className="mt-3 flex gap-4 pt-2 border-t border-gray-50">
                <div>
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-bold text-gray-900">{sym}{parseFloat(v.monto_total).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Comisión 20%</p>
                  <p className="font-bold text-green-600">{sym}{parseFloat(v.comision).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {editVenta && (
        <VentaEditModal
          venta={editVenta}
          onClose={() => setEditVenta(null)}
          onUpdated={fetchVentas}
        />
      )}
    </>
  )
}