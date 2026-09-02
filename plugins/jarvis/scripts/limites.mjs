/**
 * Tetos de reembolso: por pedido, por dia e por semana corrida.
 *
 * O limite por transação sozinho não segura nada — dez reembolsos de 149 são
 * 1.490 sem uma confirmação sequer. Os acumulados existem para isso, e são
 * calculados a partir do log, não de um contador em memória: contador se perde
 * no reinício, e um teto que zera sozinho não é um teto.
 *
 * A semana é corrida (últimos 7 dias), não a semana do calendário. Semana de
 * calendário cria a segunda-feira em que tudo é permitido de novo.
 */
import { lerConfig, offsetMinutos } from './config.mjs'
import { lerLog } from './log.mjs'

const DIA = 86400000

/** Início do dia local, em epoch, respeitando o fuso configurado. */
function inicioDoDiaLocal(agora, offMin) {
  const local = new Date(agora.getTime() + offMin * 60000)
  local.setUTCHours(0, 0, 0, 0)
  return local.getTime() - offMin * 60000
}

/** Reembolsos já executados, somados por janela. */
export function reembolsosGastos(agora = new Date(), config = lerConfig(), registros = lerLog()) {
  const off = offsetMinutos(config)
  const corteDia = inicioDoDiaLocal(agora, off)
  const corteSemana = agora.getTime() - 7 * DIA

  let dia = 0
  let semana = 0
  for (const r of registros) {
    if (r.acao !== 'reembolso.executado') continue
    const valor = Number(r.dados?.valor)
    if (!Number.isFinite(valor) || valor <= 0) continue
    const t = Date.parse(r.em)
    if (t >= corteDia) dia += valor
    if (t >= corteSemana) semana += valor
  }
  return { dia, semana }
}

/**
 * Um reembolso cabe?
 *
 * Devolve sempre o motivo, não só o veredito: "negado" sem número é a resposta
 * que faz a pessoa insistir; "negado, faltam 40 no teto do dia" é a resposta
 * que faz ela decidir.
 */
export function avaliarReembolso(valor, { agora = new Date(), config = lerConfig(), registros = lerLog() } = {}) {
  const { dinheiro } = config
  const faltando = []
  for (const campo of ['moeda', 'reembolso_max_por_pedido', 'reembolso_max_acumulado_dia', 'reembolso_max_acumulado_semana']) {
    const v = dinheiro?.[campo]
    if (v == null || (typeof v === 'string' && v.includes('____')) || (typeof v === 'number' && !(v > 0))) {
      faltando.push(`dinheiro.${campo}`)
    }
  }
  if (faltando.length) {
    return { permitido: false, motivo: 'trava de configuração ativa', faltando }
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return { permitido: false, motivo: 'valor inválido' }
  }

  const gastos = reembolsosGastos(agora, config, registros)
  const moeda = dinheiro.moeda
  const fmt = (n) => `${moeda} ${n.toFixed(2)}`

  if (valor > dinheiro.reembolso_max_por_pedido) {
    return {
      permitido: false,
      motivo: `acima do teto por pedido (${fmt(dinheiro.reembolso_max_por_pedido)})`,
      gastos,
    }
  }
  if (gastos.dia + valor > dinheiro.reembolso_max_acumulado_dia) {
    return {
      permitido: false,
      motivo: `estoura o teto do dia — já saíram ${fmt(gastos.dia)} de ${fmt(dinheiro.reembolso_max_acumulado_dia)}`,
      gastos,
    }
  }
  if (gastos.semana + valor > dinheiro.reembolso_max_acumulado_semana) {
    return {
      permitido: false,
      motivo: `estoura o teto da semana — já saíram ${fmt(gastos.semana)} de ${fmt(dinheiro.reembolso_max_acumulado_semana)}`,
      gastos,
    }
  }

  // Aviso aos 80%: o ponto de avisar é antes de bater, não depois.
  const avisos = []
  const perto = (usado, teto, nome) => {
    const pct = ((usado + valor) / teto) * 100
    if (pct >= 80) avisos.push(`${nome} em ${pct.toFixed(0)}% depois deste`)
  }
  perto(gastos.dia, dinheiro.reembolso_max_acumulado_dia, 'teto do dia')
  perto(gastos.semana, dinheiro.reembolso_max_acumulado_semana, 'teto da semana')

  return { permitido: true, gastos, avisos }
}
