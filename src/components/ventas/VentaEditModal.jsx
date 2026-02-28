import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const FORMAS_PAGO = ['Efectivo', 'Pago Móvil', 'Transferencia', 'Zinli', 'Binance']
const MONEDAS     = ['USD', 'VES']

export default function VentaEditModal({ venta, onClose, onUpdated }) {
  const [productos,     setProductos]     = useState([])
  const [loading,       setLoading]       = useState(false)
  const [nombreCliente, setNombreCliente] = useState(venta.nombre_cliente)
  const [fechaVenta,    setFechaVenta]    = useState(venta.fecha_venta)
  const [formaPago,     setFormaPago]     = useState(venta.forma_pago)
  const [moneda,        setMoneda]        = useState(venta.moneda)
  const [montoTotal,    setMontoTotal]    = useState(String(venta.monto_total))
  const [notas,         setNotas]         = useState(venta.notas || '')
  const [items,         setItems]         = useState([])

  // ── Ocultar BottomNav mientras el modal está abierto ─────────────────────
  // Se añade una clase CSS al <body> que el BottomNav lee para ocultarse.
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [])

  useEffect(() => {
    supabase.from('productos').select('id, nombre, stock').eq('activo', true).order('nombre')
      .then(({ data }) => { if (data) setProductos(data) })

    supabase.from('venta_items').select('*').eq('venta_id', venta.id)
      .then(({ data }) => {
        if (data && data.length) {
          setItems(data.map(d => ({ producto_id: d.producto_id, cantidad: d.cantidad })))
        } else {
          setItems([{ producto_id: '', cantidad: 1 }])
        }
      })
  }, [venta.id])

  const comision = montoTotal ? (parseFloat(montoTotal) * 0.20).toFixed(2) : '0.00'

  function addItem()     { setItems(prev => [...prev, { producto_id: '', cantidad: 1 }]) }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i, field, val) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!items[0]?.producto_id) { toast.error('Agrega al menos un producto'); return }
    setLoading(true)
    try {
      // 1. Actualizar venta principal
      const { error: ve } = await supabase.from('ventas').update({
        nombre_cliente: nombreCliente,
        fecha_venta:    fechaVenta,
        forma_pago:     formaPago,
        moneda,
        monto_total:    parseFloat(montoTotal),
        notas,
        updated_at:     new Date().toISOString(),
      }).eq('id', venta.id)
      if (ve) throw ve

      // 2. Eliminar items viejos (trigger devuelve stock)
      const { error: de } = await supabase.from('venta_items').delete().eq('venta_id', venta.id)
      if (de) throw de

      // 3. Insertar nuevos items (trigger resta stock)
      const newItems = items
        .filter(it => it.producto_id && it.cantidad > 0)
        .map(it => ({
          venta_id:    venta.id,
          producto_id: it.producto_id,
          cantidad:    parseInt(it.cantidad),
        }))
      const { error: ie } = await supabase.from('venta_items').insert(newItems)
      if (ie) throw ie

      toast.success('Venta actualizada')
      onUpdated?.()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    // z-[60] > z-50 del BottomNav para tapar correctamente el fondo
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">

        {/* Header sticky */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Editar Venta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 pb-8">
          {/* Cliente */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
            <input required value={nombreCliente} onChange={e => setNombreCliente(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm
                         focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>

          {/* Fecha + Forma pago */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha</label>
              <input required type="date" value={fechaVenta} onChange={e => setFechaVenta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm
                           focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Forma de pago</label>
              <select value={formaPago} onChange={e => setFormaPago(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm
                           focus:ring-2 focus:ring-primary focus:outline-none">
                {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Moneda</label>
              <select value={moneda} onChange={e => setMoneda(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm
                           focus:ring-2 focus:ring-primary focus:outline-none">
                {MONEDAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Monto total</label>
              <input required type="number" min="0" step="0.01" value={montoTotal}
                onChange={e => setMontoTotal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm
                           focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>

          {/* Comisión */}
          {montoTotal && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex justify-between">
              <span className="text-sm text-green-700 font-medium">Comisión (20%)</span>
              <span className="font-bold text-green-600">{moneda} {comision}</span>
            </div>
          )}

          {/* Productos */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Productos</label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={item.producto_id} onChange={e => updateItem(i, 'producto_id', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm
                               focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Seleccionar...</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={item.cantidad}
                    onChange={e => updateItem(i, 'cantidad', e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-xl text-sm text-center
                               focus:ring-2 focus:ring-primary focus:outline-none" />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-600 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem}
              className="mt-2 text-primary text-sm font-medium hover:underline">
              + Agregar producto
            </button>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none
                         focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>

          {/* Botones — padding extra para no quedar tapados */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl
                         hover:bg-gray-50 transition text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#1a56db] text-white font-semibold py-3 rounded-xl
                         hover:bg-[#1e40af] transition disabled:opacity-60 text-sm">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}