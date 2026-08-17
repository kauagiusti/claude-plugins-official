import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EXERCICIOS_POR_ID } from '../data/exercicios'
import type {
  EstadoJogo,
  Exercicio,
  ExercicioSessao,
  ItemAlimento,
  Macros,
  MensagemCoach,
  Perfil,
  RecordePessoal,
  Refeicao,
  Serie,
  Treino,
} from '../types'
import { atualizarStreak, verificarConquistas, XP, xpDaSerie } from './gamificacao'
import { cargaSistema, classificar, estimar1RM, idadeDe } from './forca'
import { calcularMetas, somarMacros, totaisRefeicao } from './nutricao'

// ---------------------------------------------------------------------------
// Utilidades de data — sempre no fuso local, nunca UTC. Um treino às 22h de
// terça precisa cair na terça, não na quarta.
// ---------------------------------------------------------------------------

export function hojeISO(d = new Date()): string {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

export function horaAgora(d = new Date()): string {
  return d.toTimeString().slice(0, 5)
}

export function diasAtras(n: number, base = new Date()): string {
  const d = new Date(base)
  d.setDate(d.getDate() - n)
  return hojeISO(d)
}

function id(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ------------------------------- Estado ------------------------------------

export const PERFIL_PADRAO: Perfil = {
  nome: '',
  sexo: 'M',
  nascimento: '1998-01-01',
  alturaCm: 175,
  pesoKg: 75,
  atividade: 'moderado',
  objetivo: 'recomposicao',
  ajusteKcal: 0,
  proteinaPorKg: 1.8,
  gorduraPorKg: 0.8,
  metasManuais: null,
}

const JOGO_PADRAO: EstadoJogo = { xp: 0, conquistas: {}, streakAtual: 0, streakRecorde: 0 }

interface Estado {
  perfil: Perfil
  apiKey: string
  onboardingConcluido: boolean

  refeicoes: Refeicao[]
  treinos: Treino[]
  treinoAtivo: Treino | null
  pesos: { data: string; peso: number }[]
  jogo: EstadoJogo
  coach: MensagemCoach[]

  /** Conquistas desbloqueadas ainda não exibidas ao usuário. */
  novasConquistas: string[]

  // --- perfil / ajustes
  setPerfil: (p: Partial<Perfil>) => void
  setApiKey: (k: string) => void
  concluirOnboarding: () => void
  registrarPeso: (peso: number, data?: string) => void

  // --- nutrição
  addRefeicao: (r: Omit<Refeicao, 'id'>) => string
  removerRefeicao: (id: string) => void
  atualizarItem: (refeicaoId: string, itemId: string, mudanca: Partial<ItemAlimento>) => void
  removerItem: (refeicaoId: string, itemId: string) => void
  addItens: (refeicaoId: string, itens: Omit<ItemAlimento, 'id'>[]) => void

  // --- treino
  iniciarTreino: (nome?: string) => void
  cancelarTreino: () => void
  concluirTreino: () => void
  addExercicioSessao: (exercicioId: string) => void
  removerExercicioSessao: (sessaoId: string) => void
  addSerie: (sessaoId: string, serie: Omit<Serie, 'id'>) => void
  atualizarSerie: (sessaoId: string, serieId: string, mudanca: Partial<Serie>) => void
  removerSerie: (sessaoId: string, serieId: string) => void

  // --- coach
  addMensagemCoach: (m: Omit<MensagemCoach, 'id'>) => string
  atualizarMensagemCoach: (id: string, texto: string) => void
  limparCoach: () => void

  // --- gamificação
  ganharXp: (quantidade: number) => void
  sincronizarConquistas: () => void
  limparNovasConquistas: () => void

  resetarTudo: () => void
}

/** Fotos antigas são o que estoura o localStorage: mantém só as recentes. */
function podarFotos(refeicoes: Refeicao[], manterDias = 21): Refeicao[] {
  const corte = diasAtras(manterDias)
  return refeicoes.map((r) => (r.data < corte && r.fotoDataUrl ? { ...r, fotoDataUrl: undefined } : r))
}

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      perfil: PERFIL_PADRAO,
      apiKey: '',
      onboardingConcluido: false,
      refeicoes: [],
      treinos: [],
      treinoAtivo: null,
      pesos: [],
      jogo: JOGO_PADRAO,
      coach: [],
      novasConquistas: [],

      setPerfil: (p) =>
        set((s) => {
          const perfil = { ...s.perfil, ...p }
          // Mudou o peso pelo perfil? Registra no histórico também.
          const pesos =
            p.pesoKg && p.pesoKg !== s.perfil.pesoKg
              ? [...s.pesos.filter((x) => x.data !== hojeISO()), { data: hojeISO(), peso: p.pesoKg }]
              : s.pesos
          return { perfil, pesos }
        }),

      setApiKey: (k) => set({ apiKey: k.trim() }),
      concluirOnboarding: () => set({ onboardingConcluido: true }),

      registrarPeso: (peso, data = hojeISO()) =>
        set((s) => ({
          pesos: [...s.pesos.filter((x) => x.data !== data), { data, peso }].sort((a, b) =>
            a.data.localeCompare(b.data),
          ),
          perfil: data === hojeISO() ? { ...s.perfil, pesoKg: peso } : s.perfil,
        })),

      // ------------------------------ Nutrição ------------------------------

      addRefeicao: (r) => {
        const novaId = id()
        set((s) => {
          const refeicao: Refeicao = {
            ...r,
            id: novaId,
            itens: r.itens.map((i) => ({ ...i, id: i.id || id() })),
          }
          const xpGanho = XP.refeicaoRegistrada + (r.origem === 'foto' ? XP.fotoAnalisada : 0)
          return {
            refeicoes: podarFotos([...s.refeicoes, refeicao]),
            jogo: atualizarStreak({ ...s.jogo, xp: s.jogo.xp + xpGanho }, r.data),
          }
        })
        get().sincronizarConquistas()
        return novaId
      },

      removerRefeicao: (idRef) => set((s) => ({ refeicoes: s.refeicoes.filter((r) => r.id !== idRef) })),

      atualizarItem: (refeicaoId, itemId, mudanca) =>
        set((s) => ({
          refeicoes: s.refeicoes.map((r) =>
            r.id !== refeicaoId
              ? r
              : { ...r, itens: r.itens.map((i) => (i.id === itemId ? { ...i, ...mudanca } : i)) },
          ),
        })),

      removerItem: (refeicaoId, itemId) =>
        set((s) => ({
          refeicoes: s.refeicoes.map((r) =>
            r.id !== refeicaoId ? r : { ...r, itens: r.itens.filter((i) => i.id !== itemId) },
          ),
        })),

      addItens: (refeicaoId, itens) =>
        set((s) => ({
          refeicoes: s.refeicoes.map((r) =>
            r.id !== refeicaoId ? r : { ...r, itens: [...r.itens, ...itens.map((i) => ({ ...i, id: id() }))] },
          ),
        })),

      // ------------------------------- Treino -------------------------------

      iniciarTreino: (nome) =>
        set({
          treinoAtivo: {
            id: id(),
            data: hojeISO(),
            inicio: new Date().toISOString(),
            nome: nome || 'Treino',
            exercicios: [],
          },
        }),

      cancelarTreino: () => set({ treinoAtivo: null }),

      concluirTreino: () => {
        const { treinoAtivo } = get()
        if (!treinoAtivo) return
        // Um treino sem série concluída não vira histórico.
        const temSerie = treinoAtivo.exercicios.some((e) => e.series.some((s) => s.concluida))
        if (!temSerie) {
          set({ treinoAtivo: null })
          return
        }
        set((s) => ({
          treinos: [...s.treinos, { ...treinoAtivo, fim: new Date().toISOString() }],
          treinoAtivo: null,
          jogo: atualizarStreak({ ...s.jogo, xp: s.jogo.xp + XP.treinoConcluido }, treinoAtivo.data),
        }))
        get().sincronizarConquistas()
      },

      addExercicioSessao: (exercicioId) =>
        set((s) =>
          !s.treinoAtivo
            ? s
            : {
                treinoAtivo: {
                  ...s.treinoAtivo,
                  exercicios: [...s.treinoAtivo.exercicios, { id: id(), exercicioId, series: [] }],
                },
              },
        ),

      removerExercicioSessao: (sessaoId) =>
        set((s) =>
          !s.treinoAtivo
            ? s
            : {
                treinoAtivo: {
                  ...s.treinoAtivo,
                  exercicios: s.treinoAtivo.exercicios.filter((e) => e.id !== sessaoId),
                },
              },
        ),

      addSerie: (sessaoId, serie) => {
        const s = get()
        if (!s.treinoAtivo) return
        const sessao = s.treinoAtivo.exercicios.find((e) => e.id === sessaoId)
        if (!sessao) return

        const ex = EXERCICIOS_POR_ID[sessao.exercicioId]
        const e1rm = ex ? estimar1RM(cargaSistema(ex, serie.peso, s.perfil.pesoKg), serie.reps) : 0
        const nova: Serie = { ...serie, id: id(), e1rm }

        const cls =
          serie.concluida && !serie.aquecimento
            ? classificar({
                exercicioId: sessao.exercicioId,
                peso: serie.peso,
                reps: serie.reps,
                pesoCorporal: s.perfil.pesoKg,
                sexo: s.perfil.sexo,
                idade: idadeDe(s.perfil.nascimento),
              })
            : null

        set((st) =>
          !st.treinoAtivo
            ? st
            : {
                treinoAtivo: {
                  ...st.treinoAtivo,
                  exercicios: st.treinoAtivo.exercicios.map((e) =>
                    e.id === sessaoId ? { ...e, series: [...e.series, nova] } : e,
                  ),
                },
                jogo:
                  serie.concluida && !serie.aquecimento
                    ? { ...st.jogo, xp: st.jogo.xp + xpDaSerie(cls?.percentil ?? null) }
                    : st.jogo,
              },
        )
      },

      atualizarSerie: (sessaoId, serieId, mudanca) =>
        set((s) => {
          if (!s.treinoAtivo) return s
          const sessao = s.treinoAtivo.exercicios.find((e) => e.id === sessaoId)
          const ex = sessao ? EXERCICIOS_POR_ID[sessao.exercicioId] : undefined
          return {
            treinoAtivo: {
              ...s.treinoAtivo,
              exercicios: s.treinoAtivo.exercicios.map((e) =>
                e.id !== sessaoId
                  ? e
                  : {
                      ...e,
                      series: e.series.map((serie) => {
                        if (serie.id !== serieId) return serie
                        const atualizada = { ...serie, ...mudanca }
                        atualizada.e1rm = ex
                          ? estimar1RM(cargaSistema(ex, atualizada.peso, s.perfil.pesoKg), atualizada.reps)
                          : 0
                        return atualizada
                      }),
                    },
              ),
            },
          }
        }),

      removerSerie: (sessaoId, serieId) =>
        set((s) =>
          !s.treinoAtivo
            ? s
            : {
                treinoAtivo: {
                  ...s.treinoAtivo,
                  exercicios: s.treinoAtivo.exercicios.map((e) =>
                    e.id !== sessaoId ? e : { ...e, series: e.series.filter((x) => x.id !== serieId) },
                  ),
                },
              },
        ),

      // -------------------------------- Coach -------------------------------

      addMensagemCoach: (m) => {
        const novaId = id()
        set((s) => ({ coach: [...s.coach.slice(-40), { ...m, id: novaId }] }))
        return novaId
      },

      atualizarMensagemCoach: (idMsg, texto) =>
        set((s) => ({ coach: s.coach.map((m) => (m.id === idMsg ? { ...m, texto } : m)) })),

      limparCoach: () => set({ coach: [] }),

      // ----------------------------- Gamificação ----------------------------

      ganharXp: (quantidade) => set((s) => ({ jogo: { ...s.jogo, xp: s.jogo.xp + quantidade } })),

      sincronizarConquistas: () => {
        const s = get()
        const novas = verificarConquistas(s.jogo, contextoConquistas(s))
        if (novas.length === 0) return
        const agora = new Date().toISOString()
        set((st) => ({
          jogo: {
            ...st.jogo,
            conquistas: { ...st.jogo.conquistas, ...Object.fromEntries(novas.map((n) => [n, agora])) },
          },
          novasConquistas: [...st.novasConquistas, ...novas],
        }))
      },

      limparNovasConquistas: () => set({ novasConquistas: [] }),

      resetarTudo: () =>
        set({
          perfil: PERFIL_PADRAO,
          refeicoes: [],
          treinos: [],
          treinoAtivo: null,
          pesos: [],
          jogo: JOGO_PADRAO,
          coach: [],
          novasConquistas: [],
          onboardingConcluido: false,
        }),
    }),
    {
      name: 'apice-v1',
      version: 1,
      partialize: (s) => ({
        perfil: s.perfil,
        apiKey: s.apiKey,
        onboardingConcluido: s.onboardingConcluido,
        refeicoes: s.refeicoes,
        treinos: s.treinos,
        treinoAtivo: s.treinoAtivo,
        pesos: s.pesos,
        jogo: s.jogo,
        coach: s.coach,
      }),
    },
  ),
)

// ---------------------------------------------------------------------------
// Seletores — funções puras sobre o estado, fora do create para não recriarem
// referências a cada render.
// ---------------------------------------------------------------------------

type EstadoLeitura = Pick<Estado, 'perfil' | 'refeicoes' | 'treinos' | 'treinoAtivo' | 'jogo' | 'pesos'>

export function refeicoesDoDia(s: EstadoLeitura, data = hojeISO()): Refeicao[] {
  return s.refeicoes
    .filter((r) => r.data === data)
    .sort((a, b) => a.hora.localeCompare(b.hora))
}

export function totaisDoDia(s: EstadoLeitura, data = hojeISO()): Macros {
  return somarMacros(refeicoesDoDia(s, data).map(totaisRefeicao))
}

export function metasDe(s: EstadoLeitura) {
  return calcularMetas(s.perfil)
}

export function treinosDoDia(s: EstadoLeitura, data = hojeISO()): Treino[] {
  return s.treinos.filter((t) => t.data === data)
}

/** Todas as séries válidas já registradas, incluindo o treino em andamento. */
export function todasAsSessoes(s: EstadoLeitura): { data: string; sessao: ExercicioSessao }[] {
  const historico = s.treinos.flatMap((t) => t.exercicios.map((sessao) => ({ data: t.data, sessao })))
  const ativo = s.treinoAtivo
    ? s.treinoAtivo.exercicios.map((sessao) => ({ data: s.treinoAtivo!.data, sessao }))
    : []
  return [...historico, ...ativo]
}

/** Melhor marca de cada exercício, por 1RM estimado. */
export function recordes(s: EstadoLeitura): Record<string, RecordePessoal> {
  const mapa: Record<string, RecordePessoal> = {}
  const idade = idadeDe(s.perfil.nascimento)

  for (const { data, sessao } of todasAsSessoes(s)) {
    const ex = EXERCICIOS_POR_ID[sessao.exercicioId]
    if (!ex) continue
    for (const serie of sessao.series) {
      if (!serie.concluida || serie.aquecimento || serie.reps <= 0) continue
      const e1rm = estimar1RM(cargaSistema(ex, serie.peso, s.perfil.pesoKg), serie.reps)
      if (e1rm <= 0) continue
      const atual = mapa[sessao.exercicioId]
      if (atual && atual.e1rm >= e1rm) continue
      const cls = classificar({
        exercicioId: sessao.exercicioId,
        peso: serie.peso,
        reps: serie.reps,
        pesoCorporal: s.perfil.pesoKg,
        sexo: s.perfil.sexo,
        idade,
      })
      mapa[sessao.exercicioId] = {
        exercicioId: sessao.exercicioId,
        e1rm,
        peso: serie.peso,
        reps: serie.reps,
        data,
        percentil: cls?.percentil ?? 0,
      }
    }
  }
  return mapa
}

/** Última série registrada de um exercício, para sugerir progressão. */
export function ultimaSerieDe(s: EstadoLeitura, exercicioId: string): Serie | null {
  const sessoes = todasAsSessoes(s)
    .filter((x) => x.sessao.exercicioId === exercicioId)
    .sort((a, b) => b.data.localeCompare(a.data))
  for (const { sessao } of sessoes) {
    const validas = sessao.series.filter((x) => x.concluida && !x.aquecimento)
    if (validas.length > 0) return validas[validas.length - 1]
  }
  return null
}

export function volumeDoTreino(t: Treino, pesoCorporal: number): number {
  let total = 0
  for (const sessao of t.exercicios) {
    const ex = EXERCICIOS_POR_ID[sessao.exercicioId]
    if (!ex || ex.tipo === 'cardio') continue
    for (const serie of sessao.series) {
      if (!serie.concluida || serie.aquecimento) continue
      total += cargaSistema(ex, serie.peso, pesoCorporal) * serie.reps
    }
  }
  return total
}

export function volumeSemanal(s: EstadoLeitura, semanasAtras = 0): number {
  const fim = diasAtras(semanasAtras * 7)
  const inicio = diasAtras(semanasAtras * 7 + 6)
  return s.treinos
    .filter((t) => t.data >= inicio && t.data <= fim)
    .reduce((acc, t) => acc + volumeDoTreino(t, s.perfil.pesoKg), 0)
}

export function diasBatendoProteina(s: EstadoLeitura): number {
  const metas = calcularMetas(s.perfil)
  const porDia = new Map<string, number>()
  for (const r of s.refeicoes) {
    porDia.set(r.data, (porDia.get(r.data) ?? 0) + totaisRefeicao(r).proteina)
  }
  let dias = 0
  porDia.forEach((p) => {
    if (p >= metas.proteina * 0.95) dias++
  })
  return dias
}

function vsPesoDe(prs: Record<string, RecordePessoal>, exercicioId: string, pesoCorporal: number): number {
  const pr = prs[exercicioId]
  if (!pr || pesoCorporal <= 0) return 0
  return pr.e1rm / pesoCorporal
}

export function contextoConquistas(s: EstadoLeitura) {
  const prs = recordes(s)
  const percentis = Object.values(prs)
    .map((p) => p.percentil)
    .filter((p) => p > 0)
  const gruposTreinados = new Set(
    todasAsSessoes(s)
      .map((x) => EXERCICIOS_POR_ID[x.sessao.exercicioId]?.grupo)
      .filter(Boolean),
  ).size

  return {
    totalTreinos: s.treinos.length,
    totalSeries: s.treinos.reduce(
      (acc, t) => acc + t.exercicios.reduce((a, e) => a + e.series.filter((x) => x.concluida).length, 0),
      0,
    ),
    totalRefeicoes: s.refeicoes.length,
    totalFotos: s.refeicoes.filter((r) => r.origem === 'foto').length,
    streak: s.jogo.streakAtual,
    melhorPercentil: percentis.length ? Math.max(...percentis) : 0,
    percentis,
    supinoVsPeso: vsPesoDe(prs, 'supino-reto-barra', s.perfil.pesoKg),
    terraVsPeso: vsPesoDe(prs, 'terra', s.perfil.pesoKg),
    agachamentoVsPeso: vsPesoDe(prs, 'agachamento-livre', s.perfil.pesoKg),
    diasMetaProteina: diasBatendoProteina(s),
    volumeSemanalKg: Math.max(volumeSemanal(s, 0), volumeSemanal(s, 1)),
    gruposTreinados,
  }
}

export function exercicioDe(exercicioId: string): Exercicio | undefined {
  return EXERCICIOS_POR_ID[exercicioId]
}
