/**
 * ClienteInput
 *
 * Componente de presentación puro para el "Smart Customer Input".
 * Recibe todo su estado y handlers desde el hook useClienteAutocomplete.
 * Usado tanto por VentaForm como por VentaEditModal para garantizar
 * UI/UX y comportamiento 100% idénticos en ambos contextos.
 *
 * Props:
 *   nombreCliente  {string}   Valor actual del input
 *   clienteValido  {boolean}  true = nombre en DB, false = no encontrado
 *   sugerencias    {Array}    Lista de clubs/tiendas filtradas (máx 8)
 *   mostrarSug     {boolean}  Controla visibilidad del dropdown
 *   contenedorRef  {ref}      Ref al div envolvente (para click-away)
 *   onChange       {fn}       Handler del input
 *   onFocus        {fn}       Handler de foco
 *   onSeleccionar  {fn}       Handler de click en sugerencia
 */
export default function ClienteInput({
  nombreCliente,
  clienteValido,
  sugerencias,
  mostrarSug,
  contenedorRef,
  onChange,
  onFocus,
  onSeleccionar,
  onClear,
}) {
  // Determinar estado visual del input
  const inputClass = [
    'w-full px-3 py-2.5 border rounded-xl text-sm transition',
    'focus:outline-none focus:ring-2',
    nombreCliente && clienteValido
      ? 'border-green-400 focus:ring-green-200 bg-green-50/30'
      : nombreCliente && !clienteValido
        ? 'border-red-300 focus:ring-red-200 bg-red-50/30'
        : 'border-gray-300 focus:ring-[#15334e]/20',
  ].join(' ')

  return (
    <div ref={contenedorRef} className="relative">

      {/* Label con indicador de validez */}
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-2">
        Cliente *
        {nombreCliente && (
          clienteValido ? (
            <span className="flex items-center gap-1 text-green-600 font-semibold normal-case tracking-normal text-xs">
              {/* Checkmark */}
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Cliente válido
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500 font-semibold normal-case tracking-normal text-xs">
              {/* X circle */}
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              No está en la lista
            </span>
          )
        )}
      </label>

      {/* Input con ícono de estado a la derecha */}
      <div className="relative">
        <input
          required
          autoComplete="off"
          value={nombreCliente}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder="Buscar club o tienda..."
          style={{ fontSize: '16px' }}
          className={inputClass}
        />

        {/* Ícono de estado superpuesto */}
        {nombreCliente && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center z-10">
            {clienteValido ? (
              <svg viewBox="0 0 20 20" fill="#16a34a" className="w-4 h-4 pointer-events-none">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            ) : (
              <button 
                type="button" 
                onMouseDown={(e) => { e.preventDefault(); onClear(); }} 
                className="hover:scale-110 transition-transform cursor-pointer"
              >
                <svg viewBox="0 0 20 20" fill="#ef4444" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </span>
        )}
      </div>

      {/* Dropdown flotante de sugerencias */}
      {mostrarSug && sugerencias.length > 0 && (
        <ul
          className="absolute z-[100] left-0 right-0 mt-1.5 bg-white border border-[#e2ded3]
                     rounded-xl shadow-xl overflow-hidden"
          style={{ maxHeight: '13rem', overflowY: 'auto' }}
        >
          {sugerencias.map((club, idx) => (
            <li key={club.id}>
              <button
                type="button"
                onMouseDown={() => onSeleccionar(club)}
                className={[
                  'w-full text-left px-4 py-2.5 text-sm transition',
                  'flex items-center justify-between gap-3',
                  'hover:bg-[#15334e]/5 active:bg-[#15334e]/10',
                  idx !== 0 ? 'border-t border-[#e2ded3]/60' : '',
                ].join(' ')}
              >
                <span className="font-medium text-[#15334e] truncate">{club.nombre}</span>
                <span className={[
                  'text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0',
                  club.categoria === 'Club'
                    ? 'bg-[#15334e]/10 text-[#15334e]'
                    : 'bg-[#e2ded3] text-[#15334e]/80',
                ].join(' ')}>
                  {club.categoria}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}