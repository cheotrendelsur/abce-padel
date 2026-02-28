import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── Reglas de moneda por forma de pago ────────────────────────────────────────
const FORMAS_PAGO = ['Efectivo', 'Pago Móvil', 'Transferencia', 'Zinli', 'Binance']

function monedaPorFormaPago(forma) {
  if (forma === 'Pago Móvil' || forma === 'Transferencia') return 'VES'
  return 'USD' // Efectivo, Zinli, Binance, Zelle
}

const TODAY = new Date().toISOString().split('T')[0]

export default function VentaForm({ userId, tipoInicial = 'Directa', onVentaCreada }) {
  const [productos,  setProductos]  = useState([])
  const [clubes,     setClubes]     = useState([]) // lista completa para autocompletado
  const [loading,    setLoading]    = useState(false)

  // ── Campos ────────────────────────────────────────────────────────────────
  const [nombreCliente, setNombreCliente] = useState('')
  const [clienteValido, setClienteValido] = useState(false)
  const [sugerencias,   setSugerencias]   = useState([])
  const [mostrarSug,    setMostrarSug]    = useState(false)
  const clienteRef = useRef(null)

  const [fechaVenta, setFechaVenta] = useState(TODAY)
  const [formaPago,  setFormaPago]  = useState('Efectivo')
  const [moneda,     setMoneda]     = useState('USD')
  const [montoTotal, setMontoTotal] = useState('')
  const [notas,      setNotas]      = useState('')
  const [items,      setItems]      = useState([{ producto_id: '', cantidad: 1 }])

  // ── Cargar datos iniciales ────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('productos').select('id, nombre, stock').eq('activo', true).order('nombre')
      .then(({ data }) => { if (data) setProductos(data) })

    // Cargamos tanto clubes como tiendas (toda la tabla clubes)
    supabase.from('clubes').select('id, nombre, tipo').order('nombre')
      .then(({ data }) => { if (data) setClubes(data) })
  }, [])

  // ── Autocompletado de moneda al cambiar forma de pago ────────────────────
  function handleFormaPagoChange(valor) {
    setFormaPago(valor)
    setMoneda(monedaPorFormaPago(valor))
  }

  // ── Autocompletado de cliente ─────────────────────────────────────────────
  function handleClienteChange(valor) {
    setNombreCliente(valor)

    const exacto = clubes.find(c => c.nombre.toLowerCase() === valor.toLowerCase())
    setClienteValido(!!exacto)

    // Siempre filtrar: si está vacío muestra todos (máx 8), si tiene texto filtra
    const filtradas = valor.trim().length === 0
      ? clubes.slice(0, 8)
      : clubes.filter(c => c.nombre.toLowerCase().includes(valor.toLowerCase())).slice(0, 8)

    setSugerencias(filtradas)
    setMostrarSug(filtradas.length > 0)
  }

  function handleClienteFocus() {
    // Al hacer foco, mostrar lista completa si el campo está vacío,
    // o las coincidencias actuales si ya tiene texto
    const filtradas = nombreCliente.trim().length === 0
      ? clubes.slice(0, 8)
      : clubes.filter(c => c.nombre.toLowerCase().includes(nombreCliente.toLowerCase())).slice(0, 8)
    setSugerencias(filtradas)
    setMostrarSug(filtradas.length > 0)
  }

  function seleccionarClub(club) {
    setNombreCliente(club.nombre)
    setClienteValido(true)
    setSugerencias([])
    setMostrarSug(false)
  }

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    function handleClickFuera(e) {
      if (clienteRef.current && !clienteRef.current.contains(e.target)) {
        setMostrarSug(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  // ── Helpers de items ──────────────────────────────────────────────────────
  const comision = montoTotal ? (parseFloat(montoTotal) * 0.20).toFixed(2) : '0.00'

  function addItem()    { setItems(prev => [...prev, { producto_id: '', cantidad: 1 }]) }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i, field, val) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  function reset() {
    setNombreCliente(''); setClienteValido(false); setFechaVenta(TODAY)
    setFormaPago('Efectivo'); setMoneda('USD'); setMontoTotal(''); setNotas('')
    setItems([{ producto_id: '', cantidad: 1 }])
  }

  // ── Submit con validación de stock ────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()

    // Validar cliente válido
    if (!clienteValido) {
      toast.error('Selecciona un cliente válido de la lista')
      return
    }

    const itemsFiltrados = items.filter(it => it.producto_id && parseInt(it.cantidad) > 0)
    if (itemsFiltrados.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }

    // ── Validación de stock ANTES de insertar ─────────────────────────────
    const erroresStock = []
    for (const item of itemsFiltrados) {
      const producto = productos.find(p => p.id === item.producto_id)
      if (!producto) continue
      if (parseInt(item.cantidad) > producto.stock) {
        erroresStock.push(
          `"${producto.nombre}": pediste ${item.cantidad} pero solo hay ${producto.stock} en stock`
        )
      }
    }

    if (erroresStock.length > 0) {
      toast.error(
        `Stock insuficiente:\n${erroresStock.join('\n')}`,
        { duration: 5000, style: { whiteSpace: 'pre-line' } }
      )
      return // ← mantiene al usuario en el formulario
    }

    setLoading(true)
    try {
      // 1. Insertar venta
      const { data: venta, error: ve } = await supabase.from('ventas').insert({
        vendedor_id:    userId,
        nombre_cliente: nombreCliente,
        fecha_venta:    fechaVenta,
        forma_pago:     formaPago,
        moneda,
        monto_total:    parseFloat(montoTotal),
        tipo:           tipoInicial,
        notas,
      }).select().single()
      if (ve) throw ve

      // 2. Insertar items (el trigger de Supabase descuenta el stock)
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

      {/* ── Cliente con autocompletado ─────────────────────────────────── */}
      <div ref={clienteRef} className="relative">
        <label className="text-xs font-medium text-gray-600 mb-1 block">
          Cliente *
          {nombreCliente && (
            clienteValido
              ? <span className="ml-2 text-green-600 font-semibold">✓ válido</span>
              : <span className="ml-2 text-red-500 font-semibold">✗ no está en la lista</span>
          )}
        </label>
        <input
          required
          autoComplete="off"
          value={nombreCliente}
          onChange={e => handleClienteChange(e.target.value)}
          onFocus={handleClienteFocus}
          className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:outline-none transition
            ${nombreCliente && !clienteValido
              ? 'border-red-300 focus:ring-red-200'
              : nombreCliente && clienteValido
                ? 'border-green-400 focus:ring-green-200'
                : 'border-gray-300 focus:ring-primary'
            }`}
          placeholder="Buscar club o tienda..."
        />

        {/* Dropdown de sugerencias */}
        {mostrarSug && sugerencias.length > 0 && (
          <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200
                         rounded-xl shadow-lg max-h-52 overflow-y-auto">
            {sugerencias.map(club => (
              <li key={club.id}>
                <button
                  type="button"
                  onMouseDown={() => seleccionarClub(club)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition
                             flex items-center justify-between"
                >
                  <span className="font-medium text-gray-800">{club.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${club.tipo === 'Club' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {club.tipo}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Fecha y Forma de pago ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha *</label>
          <input
            required type="date" value={fechaVenta}
            onChange={e => setFechaVenta(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm
                       focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Forma de pago *</label>
          <select
            required value={formaPago}
            onChange={e => handleFormaPagoChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm
                       focus:ring-2 focus:ring-primary focus:outline-none"
          >
            {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* ── Moneda (automática) + Monto ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Moneda
            <span className="ml-1 text-gray-400 font-normal">(automática)</span>
          </label>
          <div className={`w-full px-3 py-2 rounded-xl text-sm font-semibold border-2
            ${moneda === 'VES' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-green-50 border-green-300 text-green-700'}`}>
            {moneda === 'VES' ? 'Bolívares (VES)' : 'Dólares (USD)'}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Monto total *</label>
          <input
            required type="number" min="0" step="0.01" value={montoTotal}
            onChange={e => setMontoTotal(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm
                       focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* ── Comisión calculada ────────────────────────────────────────── */}
      {montoTotal && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-green-700 font-medium">Tu comisión (20%)</span>
          <span className="text-lg font-bold text-green-600">
            {moneda === 'VES' ? 'Bs.' : '$'} {comision}
          </span>
        </div>
      )}

      {/* ── Productos con indicador de stock ─────────────────────────── */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">Productos *</label>
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm
                               focus:ring-2 focus:ring-primary focus:outline-none"
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
                    className={`w-16 px-2 py-2 border rounded-xl text-sm text-center focus:ring-2 focus:outline-none transition
                      ${stockExcedido
                        ? 'border-red-400 focus:ring-red-200 bg-red-50'
                        : 'border-gray-300 focus:ring-primary'
                      }`}
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
                {/* Aviso de stock inline */}
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
          className="mt-2 text-primary text-sm font-medium hover:underline flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar producto
        </button>
      </div>

      {/* ── Notas ─────────────────────────────────────────────────────── */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Notas (opcional)</label>
        <textarea
          value={notas} onChange={e => setNotas(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none
                     focus:ring-2 focus:ring-primary focus:outline-none"
          placeholder="Observaciones..."
        />
      </div>

      <button
        type="submit"
        disabled={loading || !clienteValido}
        className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white font-semibold py-3
                   rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Guardando...' : 'Registrar Venta'}
      </button>
    </form>
  )
}