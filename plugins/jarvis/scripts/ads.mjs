/**
 * Orçamento de anúncios: teto do mês e teto do dia.
 *
 * Existe pelo mesmo motivo que `limites.mjs`: até aqui a configuração tinha os
 * dois campos e nenhum código somava gasto nenhum. Preencher os campos deixava
 * a capacidade `anuncios` LIBERADA e completamente desprotegida — o pior tipo
 * de falha, a que parece segurança.
 *
 * Como no reembolso, o acumulado sai do log. Contador em memória se perde no
 * reinício, e teto que zera sozinho não é teto.
 */
import { lerConfig, offsetMinutos } from './config.mjs'
import { lerLog } from './log.mjs'

/** Início do dia local, em epoch, no fuso configurado. */
function inicioDoDiaLocal(agora, offMin) {
  const local = new Date(agora.getTime() + offMin * 60000)
  local.setUTCHours(0, 0, 0, 0)
  return local.getTime() - offMin * 60000
}

/**
 * Início do mês local, em epoch.
 *
 * O mês é de calendário mesmo — orçamento de anúncio é mensal e vira no dia 1,
 * ao contrário do teto de reembolso, que usa semana corrida justamente para
 * não criar a segunda-feira em que tudo é permitido de novo.
 */
function inicioDoMesLocal(agora, offMin) {
  const local = new Date(agora.getTime() + offMin * 60000)
  local.setUTCDate(1)
  local.setUTCHours(0, 0, 0, 0)
  return local.getTime() - offMin * 60000
}

/** Gasto com anúncios já registrado, por janela. */
export function gastoEmAds(agora = new Date(), config = lerConfig(), registros = lerLog()) {
  const off = offsetMinutos(config)
  const corteDia = inicioDoDiaLocal(agora, off)
  const corteMes = inicioDoMesLocal(agora, off)

  let dia = 0
  let mes = 0
  for (const r of registros) {
    if (r.acao !== 'ads.gasto') continue
    const valor = Number(r.dados?.valor)
    if (!Number.isFinite(valor) || valor <= 0) continue
    const t = Date.parse(r.em)
    if (t >= corteDia) dia += valor
    if (t >= corteMes) mes += valor
  }
  return { dia, mes }
}

/** Um gasto em anúncio cabe nos tetos? Sempre devolve o motivo e o número. */
export function avaliarAds(valor, { agora = new Date(), config = lerConfig(), registros = lerLog() } = {}) {
  const { dinheiro } = config
  const faltando = []
  for (const campo of ['moeda', 'ads_orcamento_mes', 'ads_gasto_max_dia']) {
    const v = dinheiro?.[campo]
    if (v == null || (typeof v === 'string' && v.includes('____')) || (typeof v === 'number' && !(v > 0))) {
      faltando.push(`dinheiro.${campo}`)
    }
  }
  if (faltando.length) return { permitido: false, motivo: 'trava de configuração ativa', faltando }

  if (!Number.isFinite(valor) || valor <= 0) return { permitido: false, motivo: 'valor inválido' }

  const gastos = gastoEmAds(agora, config, registros)
  const fmt = (n) => `${dinheiro.moeda} ${n.toFixed(2)}`

  if (gastos.dia + valor > dinheiro.ads_gasto_max_dia) {
    return {
      permitido: false,
      motivo: `estoura o teto do dia — já saíram ${fmt(gastos.dia)} de ${fmt(dinheiro.ads_gasto_max_dia)}`,
      gastos,
    }
  }
  if (gastos.mes + valor > dinheiro.ads_orcamento_mes) {
    return {
      permitido: false,
      motivo: `estoura o orçamento do mês — já saíram ${fmt(gastos.mes)} de ${fmt(dinheiro.ads_orcamento_mes)}`,
      gastos,
    }
  }

  const avisos = []
  const perto = (usado, teto, nome) => {
    const pct = ((usado + valor) / teto) * 100
    if (pct >= 80) avisos.push(`${nome} em ${pct.toFixed(0)}% depois deste`)
  }
  perto(gastos.dia, dinheiro.ads_gasto_max_dia, 'teto do dia')
  perto(gastos.mes, dinheiro.ads_orcamento_mes, 'orçamento do mês')

  return { permitido: true, gastos, avisos }
}
