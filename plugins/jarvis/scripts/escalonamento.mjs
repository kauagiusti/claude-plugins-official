/**
 * Escalonamento: agregação, janela de silêncio, teto por hora e escada.
 *
 * Até aqui essas regras existiam só como texto no prompt, e texto não segura
 * cinquenta ligações às três da manhã. O que decide se alguém é acordado mora
 * neste arquivo, e a decisão sai do log — a única fonte que sobrevive a um
 * reinício do processo.
 */
import { lerConfig, offsetMinutos } from './config.mjs'
import { lerLog } from './log.mjs'

const MINUTO = 60000

/**
 * A escada, em minutos desde a abertura do escalonamento.
 *
 * Gradual de propósito. O rascunho original saltava de "notificou" para
 * "ligação" em cinco minutos, o que transforma qualquer reunião de meia hora
 * numa ligação perdida — e ligação perdida por bobagem é o caminho mais curto
 * para o alerta seguinte ser ignorado.
 */
const ESCADA = {
  P1: [
    { minuto: 0, canal: 'push+email' },
    { minuto: 5, canal: 'push' },
    { minuto: 20, canal: 'sms' },
    { minuto: 30, canal: 'ligacao' },
  ],
  // P2 nunca chega ao telefone: repete e depois espaça.
  P2: [
    { minuto: 0, canal: 'push+email' },
    { minuto: 5, canal: 'push' },
    { minuto: 60, canal: 'push' },
    { minuto: 1440, canal: 'push' },
  ],
  // P3 não notifica. Entra na fila e aparece no relatório.
  P3: [],
}

/** "22:00" → minutos desde a meia-noite. */
function emMinutos(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Minutos desde a meia-noite no fuso configurado. */
function horaLocal(agora, config) {
  const local = new Date(agora.getTime() + offsetMinutos(config) * MINUTO)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}

/**
 * Estamos dentro da janela de silêncio?
 *
 * A janela normalmente atravessa a meia-noite ("22:00 às 07:00"), e é aí que
 * uma comparação ingênua falha: `22*60 <= agora && agora < 7*60` nunca é
 * verdade, e a janela simplesmente não existiria.
 */
export function dentroDoSilencio(agora = new Date(), config = lerConfig()) {
  const de = emMinutos(config?.escalonamento?.janela_silencio?.de)
  const ate = emMinutos(config?.escalonamento?.janela_silencio?.ate)
  if (de == null || ate == null) return false // sem janela definida, nada é silenciado
  if (de === ate) return false

  const agoraMin = horaLocal(agora, config)
  return de < ate ? agoraMin >= de && agoraMin < ate : agoraMin >= de || agoraMin < ate
}

/**
 * Junta eventos pela causa-raiz.
 *
 * Cinquenta pedidos travados pela mesma falha de pagamento são UM alerta
 * dizendo "cinquenta pedidos", não cinquenta alertas. Sem esta função, um bug
 * de integração vira uma negação de serviço contra o próprio dono da loja.
 */
export function agregar(eventos = []) {
  const porCausa = new Map()
  for (const e of eventos) {
    const causa = e?.causa ?? 'sem-causa'
    const atual = porCausa.get(causa)
    if (atual) {
      atual.ocorrencias += 1
      atual.afetados.push(e.afetado ?? null)
      if (PRIORIDADES.indexOf(e.prioridade) < PRIORIDADES.indexOf(atual.prioridade)) {
        // Se um dos eventos é mais grave, o grupo herda a gravidade maior.
        atual.prioridade = e.prioridade
      }
    } else {
      porCausa.set(causa, {
        causa,
        prioridade: PRIORIDADES.includes(e?.prioridade) ? e.prioridade : 'P2',
        ocorrencias: 1,
        afetados: [e?.afetado ?? null],
      })
    }
  }
  return [...porCausa.values()].sort(
    (a, b) => PRIORIDADES.indexOf(a.prioridade) - PRIORIDADES.indexOf(b.prioridade) || b.ocorrencias - a.ocorrencias,
  )
}

const PRIORIDADES = ['P1', 'P2', 'P3']

/** Escalonamentos notificados na última hora, pelo log. */
export function notificadosNaUltimaHora(agora = new Date(), registros = lerLog()) {
  const corte = agora.getTime() - 60 * MINUTO
  return registros.filter((r) => r.acao === 'escalonamento.notificado' && Date.parse(r.em) >= corte).length
}

/** Quando esta causa foi notificada por último. */
function ultimaNotificacaoDaCausa(causa, registros) {
  let ultima = null
  for (const r of registros) {
    if (r.acao !== 'escalonamento.notificado') continue
    if (r.dados?.causa !== causa) continue
    const t = Date.parse(r.em)
    if (ultima == null || t > ultima) ultima = t
  }
  return ultima
}

/**
 * Decide se e como notificar um grupo agregado.
 *
 * Devolve sempre o motivo. Um escalonamento que não saiu e não explica por que
 * é indistinguível de um escalonamento que falhou.
 */
export function planejarNotificacao(
  grupo,
  { agora = new Date(), config = lerConfig(), registros = lerLog(), minutosDesdeAbertura = 0 } = {},
) {
  const prioridade = PRIORIDADES.includes(grupo?.prioridade) ? grupo.prioridade : 'P2'

  if (prioridade === 'P3') {
    return { notificar: false, motivo: 'P3 não notifica — entra na fila e aparece no relatório', prioridade }
  }

  // Sem exemplos de P1 e P2 na configuração, nada é P1. Na ausência de
  // critério, ninguém é acordado.
  const temExemplos =
    (config?.escalonamento?.exemplos_p1?.length ?? 0) > 0 && (config?.escalonamento?.exemplos_p2?.length ?? 0) > 0
  const efetiva = prioridade === 'P1' && !temExemplos ? 'P2' : prioridade
  const rebaixado = efetiva !== prioridade

  // Mesma causa notificada há menos de 15 min não é notificada de novo.
  const ultima = ultimaNotificacaoDaCausa(grupo?.causa, registros)
  if (ultima != null && agora.getTime() - ultima < 15 * MINUTO) {
    return { notificar: false, motivo: 'mesma causa já notificada nos últimos 15 minutos', prioridade: efetiva }
  }

  const teto = config?.escalonamento?.max_escalonamentos_por_hora ?? 3
  if (notificadosNaUltimaHora(agora, registros) >= teto) {
    return {
      notificar: false,
      motivo: `teto de ${teto} escalonamentos por hora atingido — vai para o resumo consolidado`,
      prioridade: efetiva,
      consolidar: true,
    }
  }

  const devidos = ESCADA[efetiva].filter((d) => d.minuto <= minutosDesdeAbertura)
  const degrau = devidos[devidos.length - 1]
  if (!degrau) {
    return { notificar: false, motivo: 'nenhum degrau devido ainda', prioridade: efetiva }
  }

  const furaSilencio = (config?.escalonamento?.categorias_que_furam_silencio ?? []).includes(grupo?.causa)
  if (dentroDoSilencio(agora, config) && !furaSilencio) {
    return {
      notificar: false,
      motivo: 'dentro da janela de silêncio e a causa não está na lista que atravessa',
      prioridade: efetiva,
      adiado: true,
    }
  }

  // A ligação depende de um canal que pode não existir. Prometer ligação sem
  // telefone configurado é a pior forma de falhar: silenciosa.
  const temTelefone = !String(config?.escalonamento?.telefone_emergencia ?? '').includes('____')
  if ((degrau.canal === 'ligacao' || degrau.canal === 'sms') && !temTelefone) {
    return {
      notificar: true,
      canal: 'push+email',
      motivo: `degrau ${degrau.canal} exige telefone configurado — caiu para push+email`,
      prioridade: efetiva,
      rebaixado,
    }
  }

  return { notificar: true, canal: degrau.canal, prioridade: efetiva, rebaixado, minuto: degrau.minuto }
}
