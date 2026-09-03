#!/usr/bin/env node
/**
 * Interface de linha de comando para o log e para os tetos.
 *
 * Existe para o assistente não precisar montar JSON à mão nem carregar o
 * cálculo dos acumulados na cabeça — as duas coisas que ele faria mal e sem
 * perceber que fez mal.
 *
 *   registrar.mjs --acao email.triagem --modo autonoma --dados '{"lidos":12}'
 *   registrar.mjs --avaliar-reembolso 149
 *   registrar.mjs --avaliar-ads 80
 *   registrar.mjs --enfileirar reembolso --dados '{"valor":120,"pedido":"#1042"}'
 *   registrar.mjs --pendencias
 *   registrar.mjs --decidir <id> --veredito aprovada --por kaua
 *   registrar.mjs --lote aprovado --por kaua
 */
import { registrar, verificarCadeia, lerLog } from './log.mjs'
import { avaliarReembolso } from './limites.mjs'
import { avaliarAds } from './ads.mjs'
import { lotesLimposSeguidos } from './conteudo.mjs'
import { lerConfig } from './config.mjs'
import { decidir, enfileirar, esperando } from './pendencias.mjs'

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

const valorAds = pegar('avaliar-ads')
if (valorAds !== undefined) {
  const r = avaliarAds(Number(valorAds))
  console.log(JSON.stringify(r, null, 2))
  process.exit(r.permitido ? 0 : 1)
}

// -------------------------------- conteúdo ---------------------------------

/**
 * A rampa da publicação automática só anda por aqui.
 *
 * Registrar o lote e ler o contador é a mesma operação de propósito: o número
 * que libera a publicação sai do log, e o log é a única coisa que o assistente
 * escreve mas não pode reescrever.
 */
const lote = pegar('lote')
if (lote !== undefined) {
  if (lote !== 'aprovado' && lote !== 'alterado') {
    console.error('--lote aceita apenas "aprovado" ou "alterado"')
    process.exit(64)
  }
  const por = pegar('por')
  if (!por) {
    console.error('--lote exige --por <quem>: aprovar lote é decisão de pessoa, não do assistente')
    process.exit(64)
  }
  registrar({
    acao: `conteudo.lote_${lote}`,
    modo: 'confirmada',
    confirmadoPor: por,
    dados: pegar('dados') ? JSON.parse(pegar('dados')) : null,
  })
  const config = lerConfig()
  const necessarios = config?.conteudo?.lotes_necessarios ?? 5
  const limpos = lotesLimposSeguidos()
  if (lote === 'alterado') {
    console.log(`lote alterado registrado — contagem zerada (0/${necessarios})`)
  } else {
    console.log(`lote aprovado sem alteração — ${limpos}/${necessarios}`)
  }
  if (limpos >= necessarios && config?.conteudo?.publicacao_automatica_liberada !== true) {
    console.log('a rampa fechou. falta uma pessoa virar publicacao_automatica_liberada para true na configuração.')
  }
  process.exit(0)
}

// ----------------------------- pendências ----------------------------------

if (args.includes('--pendencias')) {
  const fila = esperando()
  if (fila.length === 0) {
    console.log('nenhuma pendência aberta.')
    process.exit(0)
  }
  for (const p of fila) {
    const valor = p.valor != null ? ` · ${p.valor}` : ''
    console.log(`${p.id}  ${p.alvo}${valor}  [${p.prioridade}]  esperando ${p.minutosEsperando} min`)
  }
  process.exit(0)
}

const alvo = pegar('enfileirar')
if (alvo !== undefined) {
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
  const id = enfileirar({ alvo, dados, prioridade: pegar('prioridade') ?? 'P2' })
  console.log(`pendência ${id} aberta: ${alvo} — aguardando confirmação`)
  process.exit(0)
}

const idDecidir = pegar('decidir')
if (idDecidir !== undefined) {
  try {
    const r = decidir(idDecidir, pegar('veredito') ?? 'aprovada', pegar('por'), {
      motivo: pegar('motivo'),
      registros: lerLog(),
    })
    console.log(
      r.bloqueadoPeloTeto
        ? `recusada pelo teto, não por você: ${r.motivo}`
        : `pendência ${idDecidir}: ${r.veredito}`,
    )
    process.exit(r.veredito === 'aprovada' ? 0 : 1)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}

// ------------------------------- registro ----------------------------------

const acao = pegar('acao')
if (!acao) {
  console.error('uso: registrar.mjs --acao <nome> --modo <autonoma|confirmada> [--por <quem>] [--dados <json>]')
  console.error('     registrar.mjs --avaliar-reembolso <valor>')
  console.error('     registrar.mjs --avaliar-ads <valor>')
  console.error('     registrar.mjs --enfileirar <alvo> [--dados <json>] [--prioridade P1|P2|P3]')
  console.error('     registrar.mjs --pendencias')
  console.error('     registrar.mjs --decidir <id> --veredito <aprovada|recusada> --por <quem> [--motivo <texto>]')
  console.error('     registrar.mjs --lote <aprovado|alterado> --por <quem>')
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
