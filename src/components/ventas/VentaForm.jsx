import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useClienteAutocomplete } from './useClienteAutocomplete'
import ClienteInput from './ClienteInput'

// ── Reglas de moneda por forma de pago ────────────────────────────────────────
const FORMAS_PAGO = ['Efectivo', 'Pago Móvil', 'Transferencia', 'Zinli', 'Binance']

function monedaPorFormaPago(forma) {
  if (forma === 'Pago Móvil' || forma === 'Transferencia') return 'VES'
  return 'USD'
}

const TODAY = new Date().toISOString().split('T')[0]

export default function VentaForm({ userId, tipoInicial = 'Directa', onVentaCreada }) {
  const [productos, setProductos] = useState([])
  const [loading,   setLoading]   = useState(false)

  // ── Smart Customer Input ──────────────────────────────────────────────────
  const cliente = useClienteAutocomplete('') // '' = alta nueva

  // ── Campos del formulario ─────────────────────────────────────────────────
  const [fechaVenta, setFechaVenta] = useState(TODAY)
  const [formaPago,  setFormaPago]  = useState('Efectivo')
  const [moneda,     setMoneda]     = useState('USD')
  const [montoTotal, setMontoTotal] = useState('')
  const [notas,      setNotas]      = useState('')
  const [items,      setItems]      = useState([{ producto_id: '', cantidad: 1 }])

  // ── Cargar productos al montar ────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('productos')
      .select('id, nombre, stock')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => { if (data) setProductos(data) })
  }, [])

  // ── Moneda automática según forma de pago ─────────────────────────────────
  function handleFormaPagoChange(valor) {
    setFormaPago(valor)
    setMoneda(monedaPorFormaPago(valor))
  }

  // ── Helpers de items ──────────────────────────────────────────────────────
  const comision = montoTotal ? (parseFloat(montoTotal) * 0.20).toFixed(2) : '0.00'

  function addItem()     { setItems(prev => [...prev, { producto_id: '', cantidad: 1 }]) }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i, field, val) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  function reset() {
    // Resetear campos locales — el cliente se resetea recargando el componente
    // (VentasPage lo hace al colapsar/expandir el formulario),
    // pero también reseteamos manualmente para soporte sin colapso.
    setFechaVenta(TODAY)
    setFormaPago('Efectivo')
    setMoneda('USD')
    setMontoTotal('')
    setNotas('')
    setItems([{ producto_id: '', cantidad: 1 }])
    // El hook de cliente no expone un reset porque el estado vive en él.
    // Si necesitas reset del cliente, pasa una key al componente padre
    // para remontarlo, o añade un reset() al hook.
  }

  // ── Submit con doble validación ───────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()

    // Validación estricta final contra la lista cargada (por si pegaron texto)
    if (!cliente.validarClienteFinal()) {
      toast.error('Selecciona un cliente válido de la lista')
      return
    }

    const itemsFiltrados = items.filter(it => it.producto_id && parseInt(it.cantidad) > 0)
    if (itemsFiltrados.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }

    // Validación de stock antes de llamar a Supabase
    const erroresStock = []
    for (const item of itemsFiltrados) {
      const producto = productos.find(p => p.id === item.producto_id)
      if (!producto) continue
      if (parseInt(item.cantidad) > producto.stock) {
        erroresStock.push(
          `"${producto.nombre}": pediste ${item.cantidad}, solo hay ${producto.stock}`
        )
      }
    }
    if (erroresStock.length > 0) {
      toast.error(
        `Stock insuficiente:\n${erroresStock.join('\n')}`,
        { duration: 5000, style: { whiteSpace: 'pre-line' } }
      )
      return
    }

    setLoading(true)
    try {
      const { data: venta, error: ve } = await supabase
        .from('ventas')
        .insert({
          vendedor_id:    userId,
          nombre_cliente: cliente.nombreCliente,
          fecha_venta:    fechaVenta,
          forma_pago:     formaPago,
          moneda,
          monto_total:    parseFloat(montoTotal),
          tipo:           tipoInicial,
          notas,
        })
        .select()
        .single()
      if (ve) throw ve

      const ventaItems = itemsFiltrados.map(it => ({
        venta_id:    venta.id,
        producto_id: it.producto_id,
        cantidad:    parseInt(it.cantidad),
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4"
    >

      {/* ── Smart Customer Input ──────────────────────────────────────── */}
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

      {/* ── Fecha y Forma de pago ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
            Fecha *
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
            Forma de pago *
          </label>
          <select
            required value={formaPago}
            onChange={e => handleFormaPagoChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm
                       focus:ring-2 focus:ring-[#15334e]/20 focus:outline-none"
          >
            {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* ── Moneda automática + Monto ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
            Moneda
            <span className="ml-1 text-gray-400 font-normal normal-case">(automática)</span>
          </label>
          <div className={`w-full px-3 py-2.5 rounded-xl text-sm font-semibold border-2
            ${moneda === 'VES'
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-green-50 border-green-300 text-green-700'}`}>
            {moneda === 'VES' ? '🇻🇪 Bolívares (VES)' : '🇺🇸 Dólares (USD)'}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
            Monto total *
          </label>
          <input
            required type="number" min="0" step="0.01" value={montoTotal}
            onChange={e => setMontoTotal(e.target.value)}
            placeholder="0.00"
            style={{ fontSize: '16px' }}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm
                       focus:ring-2 focus:ring-[#15334e]/20 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Comisión ─────────────────────────────────────────────────── */}
      {montoTotal && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-green-700 font-medium">Tu comisión (20%)</span>
          <span className="text-lg font-bold text-green-600">
            {moneda === 'VES' ? 'Bs.' : '$'} {comision}
          </span>
        </div>
      )}

      {/* ── Productos con validación de stock ────────────────────────── */}
      <div>
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
          Productos *
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
                    <option value="">Seleccionar producto...</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — Stock: {p.stock}
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

      {/* ── Notas ─────────────────────────────────────────────────────── */}
      <div>
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
          Notas
          <span className="ml-1 text-gray-400 font-normal normal-case">(opcional)</span>
        </label>
        <textarea
          value={notas} onChange={e => setNotas(e.target.value)} rows={2}
          placeholder="Observaciones..."
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none
                     focus:ring-2 focus:ring-[#15334e]/20 focus:outline-none"
        />
      </div>

      {/* ── Submit ────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading || !cliente.clienteValido}
        className="w-full bg-[#15334e] hover:bg-[#15334e]/90 active:bg-[#15334e]/80
                   text-[#e2ded3] font-semibold py-3 rounded-xl transition
                   disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? 'Guardando...' : 'Registrar Venta'}
      </button>
    </form>
  )
}