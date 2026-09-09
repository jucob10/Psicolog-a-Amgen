import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Mete el CSS y el JS DENTRO del index.html y borra los archivos sueltos.
 *
 * Por qué hace falta: el README prometía que `dist/index.html` se abre con doble
 * clic, y no era verdad. Vite emite `<script type="module" src="...">`, y sobre
 * `file://` Chrome bloquea por CORS tanto los módulos como las hojas de estilo
 * externas ("origin 'null' ... only supported for protocol schemes: http,
 * https…"). El resultado era una página en blanco, sin un error visible.
 *
 * Un `<script type="module">` EN LÍNEA sí se ejecuta desde `file://`, porque no
 * hay ninguna petición que bloquear. De ahí este modo: un único .html que se
 * puede copiar a una carpeta compartida, mandar por correo y abrir sin servidor
 * y sin internet.
 */
function inlineIntoHtml(): Plugin {
  return {
    name: 'inline-into-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html']
      if (!html || html.type !== 'asset') return

      let source = String(html.source)

      for (const [name, file] of Object.entries(bundle)) {
        if (name === 'index.html') continue

        // Ojo con el reemplazo: tiene que ser una FUNCIÓN, no una cadena. En una
        // cadena de reemplazo, `$&`, `$'` y `$1` son secuencias especiales, y el
        // JavaScript minificado está lleno de `$'`. Con una cadena, cada una
        // reinsertaba el resto del documento: el HTML salía con el bundle
        // duplicado cuatro veces y roto a mitad de una llamada.
        if (file.type === 'chunk') {
          const code = file.code
            // `</script` dentro de una cadena cerraría la etiqueta antes de tiempo.
            .replace(/<\/script/gi, '<\\/script')
            // Vite deja este marcador sin sustituir cuando `inlineDynamicImports`
            // fusiona un import() dinámico —el del GeoJSON del mapa—: es la lista
            // de dependencias que habría que precargar. Ni `modulePreload: false`
            // lo evita. En un archivo único no hay nada que precargar, así que
            // pasar `void 0` es exactamente lo correcto, no un parche.
            .replace(/__VITE_PRELOAD__/g, 'void 0')
          source = source.replace(
            new RegExp(`<script[^>]*src="[^"]*${escapeRe(name)}"[^>]*></script>`),
            () => `<script type="module">${code}</script>`,
          )
          delete bundle[name]
        } else if (name.endsWith('.css')) {
          const css = String(file.source)
          source = source.replace(
            new RegExp(`<link[^>]*href="[^"]*${escapeRe(name)}"[^>]*>`),
            () => `<style>${css}</style>`,
          )
          delete bundle[name]
        }
      }

      html.source = source
    },
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default defineConfig(({ mode }) => {
  // `vite build --mode standalone` → un solo archivo autónomo.
  const standalone = mode === 'standalone'

  return {
    plugins: [react(), ...(standalone ? [inlineIntoHtml()] : [])],
    // base './' → las rutas de los assets son relativas, así que dist/ se puede
    // servir desde una subcarpeta sin reconfigurar nada.
    base: './',
    build: {
      outDir: standalone ? 'dist-standalone' : 'dist',
      // En modo autónomo no puede quedar NINGÚN archivo aparte: ni la fuente
      // (que pasa a data URI), ni el chunk del mapa (que se fusiona).
      assetsInlineLimit: standalone ? Number.MAX_SAFE_INTEGER : 4096,
      cssCodeSplit: !standalone,
      // Sin esto, Vite deja el marcador `__VITE_PRELOAD__` sin sustituir en el
      // import() del mapa —su ayudante de precarga no se lleva bien con
      // inlineDynamicImports— y la página revienta al abrir el dashboard.
      // En un solo archivo no hay nada que precargar, así que sobra.
      modulePreload: standalone ? false : undefined,
      chunkSizeWarningLimit: standalone ? 4000 : 500,
      rollupOptions: {
        output: standalone
          ? // Sin trocear y con los import() dinámicos fusionados: en un solo
            // archivo no hay nada que cargar bajo demanda.
            { inlineDynamicImports: true }
          : {
              // ECharts y SheetJS son las dos piezas pesadas y cambian poco:
              // en chunks propios se cachean entre despliegues.
              manualChunks: {
                echarts: ['echarts', 'echarts-for-react'],
                xlsx: ['xlsx'],
              },
            },
      },
    },
  }
})
