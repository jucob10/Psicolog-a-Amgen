// El puente entre el tema y las gráficas.
//
// Devuelve la tinta del tema activo y el propio identificador: las gráficas
// meten `theme` en las dependencias de su useMemo para que un cambio de tema
// reconstruya las opciones de ECharts (el canvas no hereda CSS).

import { useTheme } from '../store/useTheme'
import { inkFor, type Ink } from './base'
import type { ThemeId } from '../store/useTheme'

export function useInk(): { ink: Ink; theme: ThemeId } {
  const theme = useTheme((s) => s.theme)
  return { ink: inkFor(theme), theme }
}
