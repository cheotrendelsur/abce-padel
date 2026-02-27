import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const FORMAS_PAGO  = ['Efectivo', 'Transferencia', 'Tarjeta', 'Zelle', 'Otro']
const MONEDAS      = ['USD', 'VES']
const TODAY        = new Date().toISOString().split('T')[0]

export default function VentaForm({ userId, onVentaCreada }) {
  const [productos, setProductos] = useState([])
  const [loading, setLoading]     = useState(false)

  // Campos del formulario
  const [tipo,          setTipo]          = useState('Directa')
  const [nombreCliente, setNombreCliente] = useState('')
  const [fechaVenta,    setFechaVenta]    = useState(TODAY)
  const [formaPago,     setFormaPago]     = useState('Efectivo')
  const [moneda,        setMoneda]        = useState('USD')
  const [montoTotal,    setMontoTotal]    = useState('')
  const [notas,         setNotas]         = useState('')
  const [items,         setItems]         = useState([{ producto_id: '', cantidad: 1 }])

  useEffect(() => {
    supabase.from('productos').select('id, nombre, stock').eq('activo', true).order('nombre')
      .then(({ data }) => { if (data) setProductos(data) })
  }, [])

  const comision = montoTotal ? (parseFloat(montoTotal) * 0.25).toFixed(2) : '0.00'

  function addItem()    { setItems(prev => [...prev, { producto_id: '', cantidad: 1 }]) }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i, field, val) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  function reset() {
    setNombreCliente(''); setFechaVenta(TODAY); setFormaPago('Efectivo')
    setMoneda('USD'); setMontoTotal(''); setNotas('')
    setItems([{ producto_id: '', cantidad: 1 }])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!items[0].producto_id) { toast.error('Agrega al menos un producto'); return }
    setLoading(true)
    try {
      // 1. Insertar venta
      const { data: venta, error: ve } = await supabase.from('ventas').insert({
        vendedor_id: userId, nombre_cliente: nombreCliente,
        fecha_venta: fechaVenta, forma_pago: formaPago, moneda,
        monto_total: parseFloat(montoTotal), tipo, notas
      }).select().single()
      if (ve) throw ve

      // 2. Insertar items (el trigger maneja el stock)
      const ventaItems = items
        .filter(it => it.producto_id && it.cantidad > 0)
        .map(it => ({
          venta_id: venta.id,
          producto_id: it.producto_id,
          cantidad: parseInt(it.cantidad),
        }))

      const { error: ie } = await supabase.from('venta_items').insert(ventaItems)
      if (ie) throw ie

      toast.success('¡Venta registrada!')
      reset()
      onVentaCreada?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <h2 className="font-bold text-gray-800 text-base">Nueva Venta</h2>

      {/* Tipo de venta */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setTipo('Directa')}
          className={`flex-1 py-2 rounded-xl border-2 font-medium text-sm transition
            ${tipo === 'Directa' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}>
          Venta Directa
        </button>
        <div className="flex-1 relative">
          <button type="button" disabled
            className="w-full py-2 rounded-xl border-2 border-gray-200 text-gray-400 font-medium text-sm cursor-not-allowed">
            Consignación
          </button>
          <span className="absolute -top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            Próximamente
          </span>
        </div>
      </div>

      {/* Cliente y Fecha */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente *</label>
          <input required value={nombreCliente} onChange={e => setNombreCliente(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Nombre del cliente" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha *</label>
          <input required type="date" value={fechaVenta} onChange={e => setFechaVenta(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Forma de pago *</label>
          <select required value={formaPago} onChange={e => setFormaPago(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none">
            {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Monto y comisión */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Moneda *</label>
          <select value={moneda} onChange={e => setMoneda(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none">
            {MONEDAS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Monto total *</label>
          <input required type="number" min="0" step="0.01" value={montoTotal}
            onChange={e => setMontoTotal(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="0.00" />
        </div>
      </div>

      {/* Comisión calculada */}
      {montoTotal && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-green-700 font-medium">Tu comisión (25%)</span>
          <span className="text-lg font-bold text-green-600">{moneda} {comision}</span>
        </div>
      )}

      {/* Productos */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">Productos *</label>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={item.producto_id}
                onChange={e => updateItem(i, 'producto_id', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Seleccionar producto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (Stock: {p.stock})
                  </option>
                ))}
              </select>
              <input
                type="number" min="1" value={item.cantidad}
                onChange={e => updateItem(i, 'cantidad', e.target.value)}
                className="w-16 px-2 py-2 border border-gray-300 rounded-xl text-sm text-center focus:ring-2 focus:ring-primary focus:outline-none"
              />
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
          className="mt-2 text-primary text-sm font-medium hover:underline flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar producto
        </button>
      </div>

      {/* Notas */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Notas (opcional)</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary focus:outline-none"
          placeholder="Observaciones..." />
      </div>

      <button type="submit" disabled={loading}
        className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
        {loading ? 'Guardando...' : 'Registrar Venta'}
      </button>
    </form>
  )
}