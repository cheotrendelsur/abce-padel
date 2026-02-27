import { useState } from 'react'
import VentaForm from '../components/ventas/VentaForm'
import HistorialVentas from '../components/ventas/HistorialVentas'

export default function VentasPage({ userId }) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <VentaForm userId={userId} onVentaCreada={() => setRefreshKey(k => k + 1)} />
      <HistorialVentas userId={userId} refreshKey={refreshKey} />
    </div>
  )
}