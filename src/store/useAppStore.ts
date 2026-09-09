// Fuente única de verdad de Bienestar360.
//
// Más simple que el store del gestor de casos original: un solo programa, sin
// cross-filters de gráfica. El estado de interacción propio del mapa (nivel de
// agregación, zona seleccionada para el panel lateral) también vive aquí,
// porque tanto el mapa como el drawer lateral lo necesitan.

import { create } from 'zustand'
import type { GestionBienestar, NivelMapa } from '../types'

const KEY = 'bienestar360_gestion'

export interface ToastMsg {
  id: number
  text: string
  tone: 'ok' | 'error'
}

interface AppState {
  rows: GestionBienestar[]
  nivelMapa: NivelMapa
  /** Nombre de ciudad o departamento seleccionado en el mapa; abre el panel lateral. */
  zonaSeleccionada: string | null
  toasts: ToastMsg[]

  setRows: (rows: GestionBienestar[]) => void
  clearRows: () => void
  setNivelMapa: (n: NivelMapa) => void
  seleccionarZona: (nombre: string | null) => void

  toast: (text: string, tone?: 'ok' | 'error') => void
  dismissToast: (id: number) => void
}

function load(): GestionBienestar[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as GestionBienestar[]) : []
  } catch {
    return []
  }
}

let toastSeq = 0

export const useAppStore = create<AppState>((set, get) => {
  function persist(value: GestionBienestar[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(value))
    } catch {
      get().toast('Datos cargados, pero no cupieron en el navegador para la próxima sesión.', 'error')
    }
  }

  return {
    rows: load(),
    nivelMapa: 'ciudad',
    zonaSeleccionada: null,
    toasts: [],

    setRows: (rows) => {
      persist(rows)
      set({ rows, zonaSeleccionada: null })
    },

    clearRows: () => {
      localStorage.removeItem(KEY)
      set({ rows: [], zonaSeleccionada: null })
    },

    setNivelMapa: (nivelMapa) => set({ nivelMapa, zonaSeleccionada: null }),

    seleccionarZona: (zonaSeleccionada) => set({ zonaSeleccionada }),

    toast: (text, tone = 'ok') => {
      const id = ++toastSeq
      set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }))
      setTimeout(() => get().dismissToast(id), 3200)
    },

    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  }
})
