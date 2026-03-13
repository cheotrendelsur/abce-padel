import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * useClienteAutocomplete
 *
 * Hook compartido por VentaForm y VentaEditModal.
 * Encapsula toda la lógica del "Smart Customer Input":
 *   - Carga la tabla `clubes` una sola vez al montar
 *   - Filtra sugerencias mientras el usuario escribe
 *   - Valida que el nombre escrito coincida exactamente con un club/tienda
 *   - Cierra el dropdown al hacer click fuera del input
 *
 * @param {string} valorInicial  Nombre de cliente pre-cargado (edición) o '' (alta)
 * @returns objeto con estado, handlers y ref para el contenedor
 */
export function useClienteAutocomplete(valorInicial = '') {
  const [clubes,       setClubes]       = useState([])
  const [nombreCliente, setNombreCliente] = useState(valorInicial)
  const [clienteValido, setClienteValido] = useState(false)
  const [sugerencias,   setSugerencias]   = useState([])
  const [mostrarSug,    setMostrarSug]    = useState(false)
  const contenedorRef = useRef(null)

  // ── Cargar lista de clubes al montar ──────────────────────────────────────
  useEffect(() => {
    supabase
      .from('clubes')
      .select('id, nombre, categoria')
      .order('nombre')
      .then(({ data, error }) => {
        if (error) { console.error('[useClienteAutocomplete] Error al cargar clubes:', error); return }
        if (!data) return
        setClubes(data)

        // Si hay un valor inicial (modo edición), validarlo contra la lista cargada
        if (valorInicial.trim()) {
          const exacto = data.find(
            c => c.nombre.toLowerCase() === valorInicial.trim().toLowerCase()
          )
          setClienteValido(!!exacto)
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // valorInicial es intencional como valor de cierre — solo nos importa en el primer render

  // ── Calcular sugerencias (función pura, sin side-effects) ─────────────────
  const calcularSugerencias = useCallback((texto, lista) => {
    if (texto.trim().length === 0) return lista.slice(0, 8)
    return lista
      .filter(c => c.nombre.toLowerCase().includes(texto.trim().toLowerCase()))
      .slice(0, 8)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Llamado en onChange del input */
  function handleChange(valor) {
    setNombreCliente(valor)
    // Validar match exacto (case-insensitive)
    const exacto = clubes.find(c => c.nombre.toLowerCase() === valor.trim().toLowerCase())
    setClienteValido(!!exacto)
    // Actualizar sugerencias
    const sugs = calcularSugerencias(valor, clubes)
    setSugerencias(sugs)
    setMostrarSug(sugs.length > 0)
  }

  /** Llamado en onFocus del input */
  function handleFocus() {
    const sugs = calcularSugerencias(nombreCliente, clubes)
    setSugerencias(sugs)
    setMostrarSug(sugs.length > 0)
  }

  /** Llamado al hacer click en un item de la lista */
  function seleccionar(club) {
    setNombreCliente(club.nombre)
    setClienteValido(true)
    setSugerencias([])
    setMostrarSug(false)
  }

  // ── Cerrar dropdown al hacer click fuera ──────────────────────────────────
  useEffect(() => {
    function handleClickFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setMostrarSug(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  // ── Validación final (para llamar en handleSubmit/handleSave) ─────────────
  /** Devuelve true si el nombre actual existe en la tabla de clubes */
  function validarClienteFinal() {
    return clubes.some(
      c => c.nombre.toLowerCase() === nombreCliente.trim().toLowerCase()
    )
  }

  function limpiar() {
    setNombreCliente('')
    setClienteValido(false)
    setSugerencias([])
    setMostrarSug(false)
  }

  return {
    nombreCliente,
    clienteValido,
    sugerencias,
    mostrarSug,
    contenedorRef,
    handleChange,
    handleFocus,
    seleccionar,
    validarClienteFinal,
    limpiar,
  }
}