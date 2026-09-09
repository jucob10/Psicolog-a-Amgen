// Tema claro / oscuro.
//
// Vive en su propio store y no en useAppStore a propósito: aquel es la fuente de
// verdad de los DATOS, y el tema no es un dato del PSP. Aquí solo hay preferencia
// de interfaz.
//
// El tema se escribe como `data-theme` en <html>, que es de donde lo leen tanto
// el CSS (`:root[data-theme='light']`) como las gráficas (`inkFor`).

import { create } from 'zustand'

export type ThemeId = 'dark' | 'light'

const KEY = 'bienestar360_theme'

/** Preferencia guardada → preferencia del sistema → oscuro. */
function initialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    /* navegación privada: seguimos con la del sistema */
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: ThemeId) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  // color-scheme decide el color de los scrollbars nativos y de los controles
  // del sistema (select, checkbox); sin esto se quedarían oscuros en modo claro.
  document.documentElement.style.colorScheme = theme
}

interface ThemeState {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
  toggle: () => void
}

export const useTheme = create<ThemeState>((set, get) => {
  const theme = initialTheme()
  applyTheme(theme)

  const setTheme = (t: ThemeId) => {
    applyTheme(t)
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* si no se puede guardar, al menos la sesión actual respeta la elección */
    }
    set({ theme: t })
  }

  return {
    theme,
    setTheme,
    toggle: () => setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  }
})
