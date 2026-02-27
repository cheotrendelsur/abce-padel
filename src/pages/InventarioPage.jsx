import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STOCK_LEVELS = [
  { max: 5,  label: 'Crítico',  color: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  { max: 15, label: 'Bajo',     color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  { max: Infinity, label: 'OK', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
]

function stockLevel(s) {
  return STOCK_LEVELS.find(l => s <= l.max) || STOCK_LEVELS[2]
}

export default function InventarioPage() {
  const [productos, setProductos] = useState([])
  const [loading,   setLoading]   = useState(true)

  async function fetchProductos() {
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, descripcion, stock, precio_referencia')
      .eq('activo', true)
      .order('nombre')
    setProductos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProductos()

    // Suscripción en tiempo real a cambios de stock
    const channel = supabase
      .channel('productos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, fetchProductos)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando inventario...</div>

  const totalProductos = productos.length
  const stockBajo      = productos.filter(p => p.stock <= 5).length

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-primary">{totalProductos}</p>
          <p className="text-xs text-gray-500 mt-1">Productos activos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className={`text-3xl font-bold ${stockBajo > 0 ? 'text-red-500' : 'text-green-500'}`}>{stockBajo}</p>
          <p className="text-xs text-gray-500 mt-1">Stock crítico (≤5)</p>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-sm">Inventario en tiempo real</h2>
          <button onClick={fetchProductos} className="text-xs text-primary hover:underline">Actualizar</button>
        </div>
        <div className="divide-y divide-gray-50">
          {productos.map(p => {
            const level = stockLevel(p.stock)
            return (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${level.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{p.nombre}</p>
                  {p.descripcion && <p className="text-xs text-gray-400 truncate">{p.descripcion}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm">{p.stock}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${level.color}`}>
                    {level.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}