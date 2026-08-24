/**
 * Gera `loja/privacidade.html` a partir de `loja/privacidade.md`.
 *
 * A política de privacidade é a única página do projeto que vai ao ar num
 * endereço público, exigida pelo App Store Connect. Manter as duas versões na
 * mão é como a HTML ficou para trás e com marcação crua aparecendo na tela.
 *
 * Cobre o subconjunto de Markdown que a política usa: títulos, parágrafos de
 * várias linhas, listas, citação, negrito, código e links.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const origem = join(raiz, 'loja', 'privacidade.md')
const destino = join(raiz, 'loja', 'privacidade.html')

const escapar = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Marcação de trecho: código, negrito, itálico, link e URL solta. */
function inline(texto) {
  let s = escapar(texto)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  s = s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>')
  // URL solta que ainda não virou href.
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>')
  return s
}

function converter(md) {
  const linhas = md.split('\n')
  const saida = []
  let paragrafo = []
  let lista = null

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      saida.push(`<p>${inline(paragrafo.join(' '))}</p>`)
      paragrafo = []
    }
  }
  const fecharLista = () => {
    if (lista) {
      saida.push(`<ul>\n${lista.map((i) => `  <li>${inline(i)}</li>`).join('\n')}\n</ul>`)
      lista = null
    }
  }
  const fecharTudo = () => {
    fecharParagrafo()
    fecharLista()
  }

  for (const bruta of linhas) {
    const linha = bruta.trimEnd()

    if (!linha.trim()) {
      fecharTudo()
      continue
    }

    // O bloco de citação do markdown é instrução para quem publica, não texto
    // da política — não vai para a página.
    if (linha.startsWith('>')) {
      fecharTudo()
      continue
    }

    const titulo = linha.match(/^(#{1,4})\s+(.*)$/)
    if (titulo) {
      fecharTudo()
      const nivel = titulo[1].length
      saida.push(`<h${nivel}>${inline(titulo[2])}</h${nivel}>`)
      continue
    }

    const item = linha.match(/^\s*[-*]\s+(.*)$/)
    if (item) {
      fecharParagrafo()
      lista = lista ?? []
      lista.push(item[1])
      continue
    }

    // Continuação recuada de um item de lista pertence ao item, não a um
    // parágrafo novo — é o que quebrava a versão anterior.
    if (lista && /^\s{2,}\S/.test(bruta)) {
      lista[lista.length - 1] += ' ' + linha.trim()
      continue
    }

    fecharLista()
    paragrafo.push(linha.trim())
  }
  fecharTudo()

  return saida.join('\n\n')
}

const md = await readFile(origem, 'utf8')
const titulo = (md.match(/^#\s+(.*)$/m) ?? [, 'Política de Privacidade — Ápice'])[1]

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)}</title>
<style>
  :root { color-scheme: light dark; }
  body { max-width: 42rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem;
         font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         color: #16181d; background: #fff; }
  @media (prefers-color-scheme: dark) { body { color: #e6e8ec; background: #0d0f14; } }
  h1 { font-size: 1.75rem; margin: 0 0 .5rem; letter-spacing: -.02em; }
  h2 { font-size: 1.1rem; margin: 2.25rem 0 .5rem; letter-spacing: -.01em; }
  h3 { font-size: 1rem; margin: 1.5rem 0 .4rem; }
  p, li { margin: .6rem 0; }
  ul { padding-left: 1.25rem; }
  a { color: #4a7d1f; }
  @media (prefers-color-scheme: dark) { a { color: #c6f24e; } }
  strong { font-weight: 650; }
  code { font: .9em ui-monospace, SFMono-Regular, Menlo, monospace;
         background: rgba(127,127,127,.14); padding: .1em .35em; border-radius: .25em; }
</style>
</head>
<body>
${converter(md)}
</body>
</html>
`

await writeFile(destino, html)
console.log(`${destino} — ${(html.length / 1024).toFixed(1)} kB`)
