#!/usr/bin/env node
/**
 * Interface de linha de comando para o log e para os tetos.
 *
 * Existe para o assistente não precisar montar JSON à mão nem carregar o
 * cálculo dos acumulados na cabeça — as duas coisas que ele faria mal e sem
 * perceber que fez mal.
 *
 *   registrar.mjs --acao email.triagem --modo autonoma --dados '{"lidos":12}'
 *   registrar.mjs --acao reembolso --modo confirmada --por kaua --dados '{"valor":120}'
 *   registrar.mjs --avaliar-reembolso 149
 */
import { registrar, verificarCadeia } from './log.mjs'
import { avaliarReembolso } from './limites.mjs'

const args = process.argv.slice(2)
const pegar = (nome) => {
  const i = args.indexOf(`--${nome}`)
  return i >= 0 ? args[i + 1] : undefined
}

const cadeia = verificarCadeia()
if (!cadeia.intacta) {
  console.error(`log adulterado na linha ${cadeia.linha}: ${cadeia.motivo}`)
  console.error('nada será registrado até isso ser resolvido por uma pessoa.')
  process.exit(2)
}

const valorReembolso = pegar('avaliar-reembolso')
if (valorReembolso !== undefined) {
  const r = avaliarReembolso(Number(valorReembolso))
  console.log(JSON.stringify(r, null, 2))
  process.exit(r.permitido ? 0 : 1)
}

const acao = pegar('acao')
if (!acao) {
  console.error('uso: registrar.mjs --acao <nome> --modo <autonoma|confirmada> [--por <quem>] [--dados <json>]')
  console.error('     registrar.mjs --avaliar-reembolso <valor>')
  process.exit(64)
}

let dados = null
const cru = pegar('dados')
if (cru) {
  try {
    dados = JSON.parse(cru)
  } catch {
    console.error('--dados precisa ser JSON válido')
    process.exit(64)
  }
}

try {
  const r = registrar({ acao, modo: pegar('modo') ?? 'autonoma', dados, confirmadoPor: pegar('por') })
  console.log(`registrado: ${r.acao} (${r.modo}) — ${r.hash.slice(0, 12)}`)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
