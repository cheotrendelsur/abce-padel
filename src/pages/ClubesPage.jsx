import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ClubDetalle from '../components/clubes/ClubDetalle'

export default function ClubesPage({ userId }) {
  const [clubes,         setClubes]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todos')
  const [selectedClub,   setSelectedClub]   = useState(null)

  async function fetchClubes() {
    const { data } = await supabase
      .from('clubes')
      .select('id, nombre, categoria, telefono_atencion, telefono_dueno')
      .order('nombre')
    setClubes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchClubes() }, [])

  const filtered = clubes.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase())
    const matchCat    = filtroCategoria === 'Todos' || c.categoria === filtroCategoria
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda */}
      <div className="relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar club o tienda..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
        />
      </div>

      {/* Filtros categoría */}
      <div className="flex gap-2">
        {['Todos', 'Club', 'Tienda'].map(cat => (
          <button key={cat} onClick={() => setFiltroCategoria(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition
              ${filtroCategoria === cat ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {cat}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} registros</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(club => (
            <button
              key={club.id}
              onClick={() => setSelectedClub(club)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-primary/30 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                      ${club.categoria === 'Club' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {club.categoria}
                    </span>
                    <p className="font-semibold text-gray-900 text-sm truncate">{club.nombre}</p>
                  </div>
                  <div className="flex gap-3 mt-1">
                    {club.telefono_atencion && (
                      <p className="text-xs text-gray-500 truncate">📞 {club.telefono_atencion}</p>
                    )}
                    {club.telefono_dueno && (
                      <p className="text-xs text-gray-500 truncate">👤 {club.telefono_dueno}</p>
                    )}
                    {!club.telefono_atencion && !club.telefono_dueno && (
                      <p className="text-xs text-gray-400 italic">Sin teléfonos</p>
                    )}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-300 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
          {!filtered.length && (
            <div className="text-center py-12 text-gray-400 text-sm">No se encontraron resultados</div>
          )}
        </div>
      )}

      {selectedClub && (
        <ClubDetalle
          club={selectedClub}
          userId={userId}
          onClose={() => setSelectedClub(null)}
          onUpdated={() => { fetchClubes(); setSelectedClub(null) }}
        />
      )}
    </div>
  )
}