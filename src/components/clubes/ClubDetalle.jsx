import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function ClubDetalle({ club, userId, onClose, onUpdated }) {
  const [teleAtenc,  setTeleAtenc]  = useState(club.telefono_atencion || '')
  const [teleDueno,  setTeleDueno]  = useState(club.telefono_dueno || '')
  const [llamada,    setLlamada]    = useState(null)
  const [fecha1,     setFecha1]     = useState('')
  const [fecha2,     setFecha2]     = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    supabase
      .from('registro_llamadas')
      .select('*')
      .eq('club_id', club.id)
      .eq('vendedor_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setLlamada(data)
          setFecha1(data.fecha_llamada_1 || '')
          setFecha2(data.fecha_llamada_2 || '')
        }
      })
  }, [club.id, userId])

  async function saveTelefonos() {
    setSaving(true)
    const { error } = await supabase
      .from('clubes')
      .update({ telefono_atencion: teleAtenc || null, telefono_dueno: teleDueno || null, updated_at: new Date().toISOString() })
      .eq('id', club.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Teléfonos actualizados'); onUpdated?.() }
  }

  async function saveLlamadas() {
    setSaving(true)
    const payload = {
      club_id: club.id, vendedor_id: userId,
      fecha_llamada_1: fecha1 || null,
      fecha_llamada_2: fecha2 || null,
      updated_at: new Date().toISOString()
    }
    let error
    if (llamada) {
      ({ error } = await supabase.from('registro_llamadas').update(payload).eq('id', llamada.id))
    } else {
      const res = await supabase.from('registro_llamadas').insert(payload).select().single()
      error = res.error
      if (!error) setLlamada(res.data)
    }
    setSaving(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Llamadas guardadas')
      // Refrescar llamada para obtener fechas generadas
      const { data } = await supabase.from('registro_llamadas').select('*').eq('club_id', club.id).eq('vendedor_id', userId).maybeSingle()
      if (data) setLlamada(data)
    }
  }

  const fechas34y5 = llamada && fecha2 ? [
    { label: 'Contacto 3', fecha: llamada.fecha_contacto_3 },
    { label: 'Contacto 4', fecha: llamada.fecha_contacto_4 },
    { label: 'Contacto 5', fecha: llamada.fecha_contacto_5 },
  ] : []

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${club.categoria === 'Club' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
              {club.categoria}
            </span>
            <span className="font-bold text-gray-900">{club.nombre}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Teléfonos */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📞 Teléfonos de contacto</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Atención al cliente</label>
                <input value={teleAtenc} onChange={e => setTeleAtenc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="+58 XXX-XXXXXXX" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Dueño / Gerente</label>
                <input value={teleDueno} onChange={e => setTeleDueno(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="+58 XXX-XXXXXXX" />
              </div>
            </div>
            <button onClick={saveTelefonos} disabled={saving}
              className="mt-3 w-full bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium py-2 rounded-xl transition disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar teléfonos'}
            </button>
          </section>

          <hr className="border-gray-100" />

          {/* Registro de llamadas */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📅 Registro de llamadas</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">1ra llamada</label>
                <input type="date" value={fecha1} onChange={e => setFecha1(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">2da llamada</label>
                <input type="date" value={fecha2} onChange={e => setFecha2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
            </div>
            <button onClick={saveLlamadas} disabled={saving}
              className="mt-3 w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-2 rounded-xl transition disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar llamadas'}
            </button>

            {/* Fechas futuras automáticas */}
            {fechas34y5.length > 0 && (
              <div className="mt-4 bg-blue-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-700 mb-2">📌 Próximos contactos (cada 4 días)</p>
                {fechas34y5.map(({ label, fecha }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-blue-800 font-medium">{label}</span>
                    <span className="text-sm text-blue-900 font-bold">{fmtDate(fecha)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}