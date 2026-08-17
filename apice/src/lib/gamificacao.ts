import type { Conquista, EstadoJogo } from '../types'

// ---------------------------------------------------------------------------
// XP, níveis, streak e conquistas.
// ---------------------------------------------------------------------------

export const XP = {
  serie: 10,
  serieBonusPercentil: 0.4, // × percentil (0–100)
  treinoConcluido: 60,
  refeicaoRegistrada: 15,
  fotoAnalisada: 10,
  metaProteinaDoDia: 45,
  metaCaloricaDoDia: 35,
  recordePessoal: 120,
  diaDeStreak: 20,
} as const

/** XP acumulado necessário para alcançar cada nível. */
export function xpParaNivel(nivel: number): number {
  if (nivel <= 1) return 0
  return Math.round(220 * Math.pow(nivel - 1, 1.45))
}

export function nivelDoXp(xp: number): { nivel: number; atual: number; proximo: number; progresso: number } {
  let nivel = 1
  while (nivel < 200 && xp >= xpParaNivel(nivel + 1)) nivel++
  const atual = xpParaNivel(nivel)
  const proximo = xpParaNivel(nivel + 1)
  const progresso = proximo > atual ? (xp - atual) / (proximo - atual) : 1
  return { nivel, atual, proximo, progresso: Math.max(0, Math.min(1, progresso)) }
}

export function tituloDoNivel(nivel: number): string {
  if (nivel >= 60) return 'Lenda'
  if (nivel >= 45) return 'Mestre'
  if (nivel >= 35) return 'Veterano'
  if (nivel >= 25) return 'Avançado'
  if (nivel >= 15) return 'Consistente'
  if (nivel >= 8) return 'Dedicado'
  if (nivel >= 4) return 'Aprendiz'
  return 'Iniciante'
}

export function xpDaSerie(percentil: number | null): number {
  const bonus = percentil == null ? 0 : Math.round(percentil * XP.serieBonusPercentil)
  return XP.serie + bonus
}

// ------------------------------- Streak ------------------------------------

function diasDeDiferenca(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()
  return Math.round(ms / 86400000)
}

export function atualizarStreak(estado: EstadoJogo, hoje: string): EstadoJogo {
  if (estado.ultimoDiaAtivo === hoje) return estado
  const dif = estado.ultimoDiaAtivo ? diasDeDiferenca(estado.ultimoDiaAtivo, hoje) : Infinity
  const streakAtual = dif === 1 ? estado.streakAtual + 1 : 1
  return {
    ...estado,
    ultimoDiaAtivo: hoje,
    streakAtual,
    streakRecorde: Math.max(estado.streakRecorde, streakAtual),
    xp: estado.xp + XP.diaDeStreak,
  }
}

/** Um streak só se mantém se houve atividade ontem ou hoje. */
export function streakVigente(estado: EstadoJogo, hoje: string): number {
  if (!estado.ultimoDiaAtivo) return 0
  const dif = diasDeDiferenca(estado.ultimoDiaAtivo, hoje)
  return dif <= 1 ? estado.streakAtual : 0
}

// ----------------------------- Conquistas ----------------------------------

export interface ContextoConquista {
  totalTreinos: number
  totalSeries: number
  totalRefeicoes: number
  totalFotos: number
  streak: number
  melhorPercentil: number
  percentis: number[]
  supinoVsPeso: number
  terraVsPeso: number
  agachamentoVsPeso: number
  diasMetaProteina: number
  volumeSemanalKg: number
  gruposTreinados: number
}

type Def = Omit<Conquista, 'desbloqueadaEm'> & { condicao: (c: ContextoConquista) => boolean }

export const CONQUISTAS: Def[] = [
  { id: 'primeiro-treino', nome: 'Primeira série', descricao: 'Registre seu primeiro treino.', icone: '🏁', tier: 'bronze', condicao: (c) => c.totalTreinos >= 1 },
  { id: 'primeira-foto', nome: 'Olho clínico', descricao: 'Analise sua primeira refeição por foto.', icone: '📸', tier: 'bronze', condicao: (c) => c.totalFotos >= 1 },
  { id: 'dez-treinos', nome: 'Pegando o ritmo', descricao: 'Complete 10 treinos.', icone: '⚡', tier: 'bronze', condicao: (c) => c.totalTreinos >= 10 },
  { id: 'cem-series', nome: 'Centurião', descricao: 'Complete 100 séries.', icone: '💯', tier: 'prata', condicao: (c) => c.totalSeries >= 100 },
  { id: 'mil-series', nome: 'Mil séries', descricao: 'Complete 1000 séries.', icone: '🗿', tier: 'ouro', condicao: (c) => c.totalSeries >= 1000 },
  { id: 'cinquenta-treinos', nome: 'Meio centenário', descricao: 'Complete 50 treinos.', icone: '🔥', tier: 'prata', condicao: (c) => c.totalTreinos >= 50 },
  { id: 'cem-treinos', nome: 'Rotina de aço', descricao: 'Complete 100 treinos.', icone: '⚙️', tier: 'ouro', condicao: (c) => c.totalTreinos >= 100 },

  { id: 'streak-7', nome: 'Semana cheia', descricao: '7 dias seguidos de registro.', icone: '📅', tier: 'bronze', condicao: (c) => c.streak >= 7 },
  { id: 'streak-30', nome: 'Mês fechado', descricao: '30 dias seguidos de registro.', icone: '🌙', tier: 'prata', condicao: (c) => c.streak >= 30 },
  { id: 'streak-100', nome: 'Cem dias', descricao: '100 dias seguidos de registro.', icone: '💎', tier: 'diamante', condicao: (c) => c.streak >= 100 },

  { id: 'cem-refeicoes', nome: 'Diário fiel', descricao: 'Registre 100 refeições.', icone: '🍽️', tier: 'prata', condicao: (c) => c.totalRefeicoes >= 100 },
  { id: 'proteina-7', nome: 'Proteína em dia', descricao: 'Bata a meta de proteína em 7 dias.', icone: '🥩', tier: 'bronze', condicao: (c) => c.diasMetaProteina >= 7 },
  { id: 'proteina-30', nome: 'Disciplina proteica', descricao: 'Bata a meta de proteína em 30 dias.', icone: '🍗', tier: 'ouro', condicao: (c) => c.diasMetaProteina >= 30 },

  { id: 'acima-media', nome: 'Acima da média', descricao: 'Alcance o percentil 50 em algum levantamento.', icone: '📈', tier: 'bronze', condicao: (c) => c.melhorPercentil >= 50 },
  { id: 'top-20', nome: 'Top 20%', descricao: 'Entre nos 20% mais fortes em algum levantamento.', icone: '🎯', tier: 'prata', condicao: (c) => c.melhorPercentil >= 80 },
  { id: 'top-5', nome: 'Top 5%', descricao: 'Entre nos 5% mais fortes em algum levantamento.', icone: '👑', tier: 'ouro', condicao: (c) => c.melhorPercentil >= 95 },
  { id: 'top-1', nome: 'Top 1%', descricao: 'Entre no 1% mais forte em algum levantamento.', icone: '🏆', tier: 'diamante', condicao: (c) => c.melhorPercentil >= 99 },
  { id: 'tres-avancados', nome: 'Tríade sólida', descricao: 'Percentil 80+ em três levantamentos diferentes.', icone: '🔱', tier: 'platina', condicao: (c) => c.percentis.filter((p) => p >= 80).length >= 3 },

  { id: 'supino-peso', nome: 'Supino do peso', descricao: 'Supino com 1RM igual ao seu peso corporal.', icone: '🅱️', tier: 'prata', condicao: (c) => c.supinoVsPeso >= 1 },
  { id: 'supino-1-5', nome: 'Supino 1,5×', descricao: 'Supino com 1,5× o peso corporal.', icone: '💪', tier: 'ouro', condicao: (c) => c.supinoVsPeso >= 1.5 },
  { id: 'agacha-2x', nome: 'Agachamento 2×', descricao: 'Agachamento com 2× o peso corporal.', icone: '🦵', tier: 'ouro', condicao: (c) => c.agachamentoVsPeso >= 2 },
  { id: 'terra-2x', nome: 'Terra 2×', descricao: 'Levantamento terra com 2× o peso corporal.', icone: '🪨', tier: 'ouro', condicao: (c) => c.terraVsPeso >= 2 },
  { id: 'terra-2-5', nome: 'Terra 2,5×', descricao: 'Levantamento terra com 2,5× o peso corporal.', icone: '🐘', tier: 'diamante', condicao: (c) => c.terraVsPeso >= 2.5 },

  { id: 'volume-20t', nome: '20 toneladas', descricao: '20.000 kg de volume numa única semana.', icone: '🏗️', tier: 'prata', condicao: (c) => c.volumeSemanalKg >= 20000 },
  { id: 'volume-50t', nome: '50 toneladas', descricao: '50.000 kg de volume numa única semana.', icone: '🚂', tier: 'platina', condicao: (c) => c.volumeSemanalKg >= 50000 },
  { id: 'corpo-todo', nome: 'Sem dia esquecido', descricao: 'Treine 8 grupos musculares diferentes.', icone: '🧩', tier: 'prata', condicao: (c) => c.gruposTreinados >= 8 },
]

export const CONQUISTAS_POR_ID = Object.fromEntries(CONQUISTAS.map((c) => [c.id, c]))

/** Retorna os ids recém-desbloqueados, sem alterar o estado. */
export function verificarConquistas(estado: EstadoJogo, ctx: ContextoConquista): string[] {
  return CONQUISTAS.filter((c) => !estado.conquistas[c.id] && c.condicao(ctx)).map((c) => c.id)
}

export const CORES_TIER_CONQUISTA: Record<Conquista['tier'], string> = {
  bronze: '#b07d4a',
  prata: '#b8c1cc',
  ouro: '#e9b949',
  platina: '#4ec3f2',
  diamante: '#a78bfa',
}
