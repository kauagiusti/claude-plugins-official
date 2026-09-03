#!/usr/bin/env node
/**
 * A linha de abertura que a seção 0 do prompt exige.
 *
 * Reporta o que dá para verificar em código: trava de configuração, integridade
 * do log e tetos já consumidos. A parte de "quais integrações responderam" não
 * cabe aqui — só o assistente, dentro da sessão, sabe quais ferramentas de fato
 * responderam. O script cobre o resto, e diz que não cobre essa.
 */
import { estadoDaTrava, lerConfig } from './config.mjs'
import { verificarCadeia, lerLog } from './log.mjs'
import { reembolsosGastos } from './limites.mjs'
import { gastoEmAds } from './ads.mjs'
import { lotesLimposSeguidos } from './conteudo.mjs'

const config = lerConfig()
const cadeia = verificarCadeia()
const registros = lerLog()
const trava = estadoDaTrava(config, { lotesLimpos: lotesLimposSeguidos(registros) })

const jsonPuro = process.argv.includes('--json')
if (jsonPuro) {
  console.log(JSON.stringify({ trava, cadeia, registros: registros.length }, null, 2))
  process.exit(cadeia.intacta ? 0 : 2)
}

const marca = (ok) => (ok ? '  ok  ' : ' bloq ')

console.log('\nJARVIS — estado de abertura\n')
console.log(`  modo: ${trava.somenteLeitura ? 'SOMENTE LEITURA' : 'operacional'}`)
console.log(`  log:  ${cadeia.intacta ? `íntegro, ${registros.length} registro(s)` : `CADEIA QUEBRADA na linha ${cadeia.linha} — ${cadeia.motivo}`}\n`)

for (const [nome, c] of Object.entries(trava.capacidades)) {
  console.log(`${marca(c.liberada)} ${nome}`)
  for (const f of c.faltando) console.log(`         falta: ${f}`)
}

if (trava.capacidades.reembolso.liberada) {
  const g = reembolsosGastos(new Date(), config, registros)
  const m = config.dinheiro.moeda
  console.log(`\n  reembolsos: ${m} ${g.dia.toFixed(2)} hoje · ${m} ${g.semana.toFixed(2)} nos últimos 7 dias`)
}

if (trava.capacidades.anuncios.liberada) {
  const a = gastoEmAds(new Date(), config, registros)
  const m = config.dinheiro.moeda
  console.log(`  anúncios:   ${m} ${a.dia.toFixed(2)} hoje · ${m} ${a.mes.toFixed(2)} no mês`)
}

console.log('\n  integrações: verifique na sessão — este script não alcança as ferramentas.\n')

process.exit(cadeia.intacta ? 0 : 2)
