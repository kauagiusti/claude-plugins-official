/**
 * Gera o app inteiro como um único arquivo HTML.
 *
 * Serve para hospedar em lugar que só aceita uma página — pré-visualização,
 * anexo, pen drive — sem servidor de arquivos por trás. O build normal
 * (`npm run build`) continua sendo o certo para publicar de verdade: divide o
 * JavaScript em pedaços e cacheia melhor.
 *
 * O arquivo sai sem <!doctype>, <html>, <head> e <body> de propósito: é o
 * formato que o hospedeiro de artefatos espera, e um navegador abre igual.
 */
import react from '@vitejs/plugin-react'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const saidaTemp = join(raiz, '.site-unico')
const destino = join(raiz, 'dist-site', 'apice.html')

await build({
  root: raiz,
  logLevel: 'warn',
  plugins: [react()],
  define: {
    // O sandbox de pré-visualização bloqueia chamadas para api.anthropic.com;
    // o app avisa em vez de deixar parecer que a chave está errada.
    'import.meta.env.VITE_PREVIEW_SANDBOX': JSON.stringify('1'),
  },
  build: {
    outDir: saidaTemp,
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 1024 * 1024,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        // Sem isto os imports dinâmicos viram arquivos soltos, que não existem
        // quando a página é servida sozinha.
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
})

const js = await readFile(join(saidaTemp, 'app.js'), 'utf8')
const css = await readFile(join(saidaTemp, 'app.css'), 'utf8')

// "</script" dentro de uma string do bundle fecharia a tag antes da hora.
const jsSeguro = js.replace(/<\/script/gi, '<\\/script')

const html = `<title>Ápice</title>
<meta name="description" content="Calcule kcal e macros pela foto da refeição e descubra seu nível de força comparado a quem treina." />
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${jsSeguro}
</script>
`

await writeFile(destino, html)
await rm(saidaTemp, { recursive: true, force: true })

const kb = (html.length / 1024).toFixed(0)
console.log(`${destino} — ${kb} kB`)
