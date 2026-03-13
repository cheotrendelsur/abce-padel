import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useClienteAutocomplete } from './useClienteAutocomplete'
import ClienteInput from './ClienteInput'

const FORMAS_PAGO = ['Efectivo', 'Pago Móvil', 'Transferencia', 'Zinli', 'Binance']
const MONEDAS     = ['USD', 'VES']

export default function VentaEditModal({ venta, onClose, onUpdated }) {
  const [productos,  setProductos]  = useState([])
  const [loading,    setLoading]    = useState(false)
  const [fechaVenta, setFechaVenta] = useState(venta.fecha_venta)
  const [formaPago,  setFormaPago]  = useState(venta.forma_pago)
  const [moneda,     setMoneda]     = useState(venta.moneda)
  const [montoTotal, setMontoTotal] = useState(String(venta.monto_total))
  const [notas,      setNotas]      = useState(venta.notas || '')
  const [items,      setItems]      = useState([])

  // ── Smart Customer Input (pre-cargado con el nombre actual de la venta) ───
  // El hook validará automáticamente el valor inicial contra la tabla de clubes
  // en cuanto ésta se cargue.
  const cliente = useClienteAutocomplete(venta.nombre_cliente)

  // ── Ocultar BottomNav mientras el modal está abierto ─────────────────────
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [])

  // ── Cargar productos e items de la venta ──────────────────────────────────
  useEffect(() => {
    supabase
      .from('productos')
      .select('id, nombre, stock')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => { if (data) setProductos(data) })

    supabase
      .from('venta_items')
      .select('*')
      .eq('venta_id', venta.id)
      .then(({ data }) => {
        if (data?.length) {
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

  // ── Guardar con doble validación de cliente ───────────────────────────────
  async function handleSave(e) {
    e.preventDefault()

    // Validación estricta: el nombre debe existir en la tabla de clubes
    if (!cliente.validarClienteFinal()) {
      toast.error('El cliente debe existir en la lista. Selecciónalo del desplegable.')
      return
    }

    const itemsValidos = items.filter(it => it.producto_id && parseInt(it.cantidad) > 0)
    if (itemsValidos.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }

    setLoading(true)
    try {
      // 1. Actualizar venta principal
      const { error: ve } = await supabase
        .from('ventas')
        .update({
          nombre_cliente: cliente.nombreCliente,
          fecha_venta:    fechaVenta,
          forma_pago:     formaPago,
          moneda,
          monto_total:    parseFloat(montoTotal),
          notas,
          updated_at:     new Date().toISOString(),
        })
        .eq('id', venta.id)
      if (ve) throw ve

      // 2. Eliminar items viejos (trigger de Supabase devuelve el stock)
      const { error: de } = await supabase
        .from('venta_items')
        .delete()
        .eq('venta_id', venta.id)
      if (de) throw de

      // 3. Insertar nuevos items (trigger resta el stock)
      const newItems = itemsValidos.map(it => ({
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // z-[60] > z-50 del BottomNav — el modal siempre queda encima
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">

        {/* Header sticky */}
        <div className="sticky top-0 bg-white border-b border-[#e2ded3] px-5 py-4
                        flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-[#15334e] text-base">Editar Venta</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">
              {venta.nombre_cliente}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 pb-8">

          {/* ── Smart Customer Input ─────────────────────────────────── */}
          <ClienteInput
            nombreCliente={cliente.nombreCliente}
            clienteValido={cliente.clienteValido}
            sugerencias={cliente.sugerencias}
            mostrarSug={cliente.mostrarSug}
            contenedorRef={cliente.contenedorRef}
            onChange={cliente.handleChange}
            onFocus={cliente.handleFocus}
            onSeleccionar={cliente.seleccionar}
          />

          {/* ── Fecha + Forma de pago ────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                Fecha
              </label>
              <input
                required type="date" value={fechaVenta}
                onChange={e => setFechaVenta(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm
                           focus:ring-2 focus:ring-[#15334e]/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                Forma de pago
              </label>
              <select
                value={formaPago} onChange={e => setFormaPago(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm
                           focus:ring-2 focus:ring-[#15334e]/20 focus:outline-none"
              >
                {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                Moneda
              </label>
              <select
                value={moneda} onChange={e => setMoneda(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm
                           focus:ring-2 focus:ring-[#15334e]/20 focus:outline-none"
              >
                {MONEDAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                Monto total
              </label>
              <input
                required type="number" min="0" step="0.01" value={montoTotal}
                onChange={e => setMontoTotal(e.target.value)}
                style={{ fontSize: '16px' }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm
                           focus:ring-2 focus:ring-[#15334e]/20 focus:outline-none"
              />
            </div>
          </div>

          {/* ── Comisión ─────────────────────────────────────────────── */}
          {montoTotal && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5
                            flex items-center justify-between">
              <span className="text-sm text-green-700 font-medium">Comisión (20%)</span>
              <span className="font-bold text-green-600">{moneda} {comision}</span>
            </div>
          )}

          {/* ── Productos ────────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
              Productos
            </label>
            <div className="space-y-2">
              {items.map((item, i) => {
                const prod = productos.find(p => p.id === item.producto_id)
                const stockExcedido = prod && parseInt(item.cantidad) > prod.stock

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <select
                        value={item.producto_id}
                        onChange={e => updateItem(i, 'producto_id', e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm
                                   focus:ring-2 focus:ring-[#15334e]/20 focus:outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {productos.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} (Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number" min="1" value={item.cantidad}
                        onChange={e => updateItem(i, 'cantidad', e.target.value)}
                        className={`w-16 px-2 py-2.5 border rounded-xl text-sm text-center
                                    focus:ring-2 focus:outline-none transition
                          ${stockExcedido
                            ? 'border-red-400 focus:ring-red-200 bg-red-50'
                            : 'border-gray-300 focus:ring-[#15334e]/20'}`}
                      />
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)}
                          className="text-red-400 hover:text-red-600 transition flex-shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {stockExcedido && (
                      <p className="text-xs text-red-500 font-medium pl-1">
                        ⚠ Solo hay {prod.stock} unidades disponibles
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" onClick={addItem}
              className="mt-2 text-[#15334e] text-sm font-medium hover:underline flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar producto
            </button>
          </div>

          {/* ── Notas ─────────────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
              Notas
              <span className="ml-1 text-gray-400 font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none
                         focus:ring-2 focus:ring-[#15334e]/20 focus:outline-none"
            />
          </div>

          {/* ── Botones ───────────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-[#e2ded3] text-gray-700 font-semibold py-3
                         rounded-xl hover:bg-[#e2ded3]/40 transition text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !cliente.clienteValido}
              className="flex-1 bg-[#15334e] hover:bg-[#15334e]/90 text-[#e2ded3]
                         font-semibold py-3 rounded-xl transition
                         disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}