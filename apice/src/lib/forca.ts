import { EXERCICIOS_POR_ID } from '../data/exercicios'
import {
  alturaReferencia,
  CORES_NIVEL,
  fatorAltura,
  fatorIdade,
  limiaresPorPeso,
  NIVEIS,
  NOME_LIFT,
  PERCENTIL_NIVEL,
} from '../data/padroesForca'
import type { ClassificacaoForca, Exercicio, NivelForca, Perfil, Serie, Sexo } from '../types'

export { CORES_NIVEL, NIVEIS, NOME_LIFT }

/** Acima disso as fórmulas de 1RM deixam de ser confiáveis. */
export const REPS_CONFIAVEIS = 12

/**
 * 1RM estimado a partir de carga × repetições.
 *
 * Média de Epley e Brzycki — as duas divergem nos extremos e a média fica mais
 * próxima do real na faixa de 3 a 10 repetições. Acima de REPS_CONFIAVEIS o
 * cálculo satura: nenhuma fórmula extrapola bem uma série de 25 repetições.
 */
export function estimar1RM(peso: number, reps: number): number {
  if (peso <= 0 || reps <= 0) return 0
  if (reps === 1) return peso
  const r = Math.min(reps, REPS_CONFIAVEIS)
  const epley = peso * (1 + r / 30)
  const brzycki = peso * (36 / (37 - r))
  return (epley + brzycki) / 2
}

/** Carga que o corpo realmente move na série, somando peso corporal quando aplicável. */
export function cargaSistema(ex: Exercicio, pesoExterno: number, pesoCorporal: number): number {
  const externo = ex.unilateral ? pesoExterno * 2 : pesoExterno
  const corporal = ex.usaPesoCorporal ? pesoCorporal * (ex.fracaoCorporal ?? 1) : 0
  return externo + corporal
}

export function idadeDe(nascimento: string): number {
  const nasc = new Date(nascimento)
  if (Number.isNaN(nasc.getTime())) return 30
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return Math.max(10, Math.min(100, idade))
}

/**
 * Percentil na população treinada a partir do 1RM equivalente e dos limiares.
 * Interpola entre os pontos de corte; fora deles, satura suavemente.
 */
function percentilDe(equivalente: number, limiares: Record<NivelForca, number>): number {
  const pontos = NIVEIS.map((n) => ({ carga: limiares[n], pct: PERCENTIL_NIVEL[n] }))

  if (equivalente <= pontos[0].carga) {
    const r = pontos[0].carga > 0 ? equivalente / pontos[0].carga : 0
    return Math.max(0.5, r * pontos[0].pct)
  }
  const topo = pontos[pontos.length - 1]
  if (equivalente >= topo.carga) {
    const excesso = equivalente / topo.carga - 1
    return Math.min(99.9, topo.pct + 4.9 * (1 - Math.exp(-excesso * 6)))
  }
  for (let i = 0; i < pontos.length - 1; i++) {
    const a = pontos[i]
    const b = pontos[i + 1]
    if (equivalente >= a.carga && equivalente <= b.carga) {
      const t = (equivalente - a.carga) / (b.carga - a.carga || 1)
      return a.pct + (b.pct - a.pct) * t
    }
  }
  return 50
}

function nivelDe(equivalente: number, limiares: Record<NivelForca, number>): NivelForca {
  let nivel: NivelForca = 'Iniciante'
  for (const n of NIVEIS) {
    if (equivalente >= limiares[n]) nivel = n
  }
  return nivel
}

export interface EntradaClassificacao {
  exercicioId: string
  peso: number
  reps: number
  pesoCorporal: number
  sexo: Sexo
  idade: number
  /** Altura em cm. Ausente ou implausível = sem ajuste de altura. */
  alturaCm?: number
  /** Desliga o ajuste de altura sem apagar a altura do perfil. */
  ajustarPorAltura?: boolean
}

/**
 * Classifica uma série contra os padrões mundiais.
 * Retorna null quando o exercício não tem lift de referência (isolados sem
 * tabela, cardio, isometrias).
 */
export function classificar(e: EntradaClassificacao): ClassificacaoForca | null {
  const ex = EXERCICIOS_POR_ID[e.exercicioId]
  if (!ex?.ref) return null

  const sistema = cargaSistema(ex, e.peso, e.pesoCorporal)
  if (sistema <= 0) return null

  const e1rm = estimar1RM(sistema, e.reps)
  const equivalente = e1rm / ex.ref.coef

  const base = limiaresPorPeso(ex.ref.lift, e.sexo, e.pesoCorporal)
  const fi = fatorIdade(e.idade)
  const fa =
    e.ajustarPorAltura === false
      ? 1
      : fatorAltura(ex.ref.lift, e.sexo, e.pesoCorporal, e.alturaCm ?? 0)

  // Limiares ajustados por idade e altura, na escala do lift de referência…
  const ajustados = Object.fromEntries(
    NIVEIS.map((n) => [n, base[n] * fi * fa]),
  ) as Record<NivelForca, number>

  // …e convertidos para a escala do exercício efetivamente executado.
  const limiaresExercicio = Object.fromEntries(
    NIVEIS.map((n) => [n, ajustados[n] * ex.ref!.coef]),
  ) as Record<NivelForca, number>

  const nivel = nivelDe(equivalente, ajustados)
  const percentil = percentilDe(equivalente, ajustados)

  const idx = NIVEIS.indexOf(nivel)
  const proximo = idx < NIVEIS.length - 1 ? NIVEIS[idx + 1] : undefined
  const proximoNivel =
    proximo && equivalente < ajustados[proximo]
      ? { nivel: proximo, faltamKg: Math.max(0, limiaresExercicio[proximo] - e1rm) }
      : undefined

  return {
    e1rm,
    cargaSistema: sistema,
    nivel,
    percentil,
    vsMedia: equivalente / (ajustados.Intermediário || 1),
    vsPeso: e.pesoCorporal > 0 ? e1rm / e.pesoCorporal : 0,
    limiares: limiaresExercicio,
    proximoNivel,
    estimado: ex.ref.coef !== 1,
    ajustes: {
      idade: fi,
      altura: fa,
      alturaReferenciaCm: alturaReferencia(e.sexo, e.pesoCorporal),
    },
  }
}

/** Melhor série de uma lista (maior 1RM estimado), ignorando aquecimentos. */
export function melhorSerie(series: Serie[], ex: Exercicio, pesoCorporal: number): Serie | null {
  let melhor: Serie | null = null
  let melhorE1rm = 0
  for (const s of series) {
    if (s.aquecimento || !s.concluida || s.reps <= 0) continue
    const v = estimar1RM(cargaSistema(ex, s.peso, pesoCorporal), s.reps)
    if (v > melhorE1rm) {
      melhorE1rm = v
      melhor = s
    }
  }
  return melhor
}

export function classificarSerie(
  exercicioId: string,
  serie: Serie,
  perfil: Perfil,
): ClassificacaoForca | null {
  return classificar({
    exercicioId,
    peso: serie.peso,
    reps: serie.reps,
    pesoCorporal: perfil.pesoKg,
    sexo: perfil.sexo,
    idade: idadeDe(perfil.nascimento),
    alturaCm: perfil.alturaCm,
    ajustarPorAltura: perfil.ajustarPorAltura,
  })
}

// ------------------------------ Score global -------------------------------

export type Tier = 'Bronze' | 'Prata' | 'Ouro' | 'Platina' | 'Diamante' | 'Lendário'

export const CORES_TIER: Record<Tier, string> = {
  Bronze: '#b07d4a',
  Prata: '#b8c1cc',
  Ouro: '#e9b949',
  Platina: '#4ec3f2',
  Diamante: '#a78bfa',
  Lendário: '#ff7a45',
}

export function tierDoScore(score: number): Tier {
  if (score >= 92) return 'Lendário'
  if (score >= 80) return 'Diamante'
  if (score >= 65) return 'Platina'
  if (score >= 50) return 'Ouro'
  if (score >= 30) return 'Prata'
  return 'Bronze'
}

/**
 * Score geral de força: média dos percentis dos melhores lifts registrados.
 * Só considera exercícios com tabela de referência.
 */
export function scoreGeral(percentis: number[]): number {
  if (percentis.length === 0) return 0
  const ordenados = [...percentis].sort((a, b) => b - a)
  // Os 5 melhores dominam, para não punir quem treina poucos movimentos.
  const usados = ordenados.slice(0, 5)
  return usados.reduce((a, b) => a + b, 0) / usados.length
}

// ---------------------------- Progressão de carga --------------------------

export interface SugestaoProgressao {
  peso: number
  reps: number
  texto: string
}

/**
 * Sugestão de próxima carga por dupla progressão: sobe repetições dentro da
 * faixa e, ao completar o topo, sobe a carga e volta ao piso.
 */
export function sugerirProgressao(
  ultimaSerie: { peso: number; reps: number; rpe?: number } | null,
  ex: Exercicio,
  faixa: [number, number] = [6, 10],
): SugestaoProgressao | null {
  if (!ultimaSerie || ultimaSerie.peso <= 0) return null
  const [min, max] = faixa
  // Incremento mínimo prático: halteres e unilaterais sobem em degraus maiores.
  const passo = ex.unilateral ? 2 : ex.equipamento === 'barra' ? 2.5 : 2.5
  const facil = (ultimaSerie.rpe ?? 8) <= 7

  if (ultimaSerie.reps >= max || facil) {
    const peso = Math.round((ultimaSerie.peso + passo) * 2) / 2
    return {
      peso,
      reps: min,
      texto: `Suba para ${peso} kg × ${min} reps — você fechou o topo da faixa.`,
    }
  }

  // Só sugere recuar quando a série ficou claramente abaixo da faixa. Uma
  // repetição a menos que o piso é variação normal de dia — mandar reduzir
  // carga aí é conselho ruim, e some com a progressão de quem treina pesado
  // em faixas baixas.
  if (ultimaSerie.reps < min - 2) {
    const peso = Math.max(passo, Math.round((ultimaSerie.peso - passo) * 2) / 2)
    return {
      peso,
      reps: min,
      texto: `Reduza para ${peso} kg e busque ${min} reps limpas antes de subir.`,
    }
  }

  const alvo = Math.max(min, ultimaSerie.reps + 1)
  return {
    peso: ultimaSerie.peso,
    reps: alvo,
    texto: `Mantenha ${ultimaSerie.peso} kg e tente ${alvo} reps.`,
  }
}
