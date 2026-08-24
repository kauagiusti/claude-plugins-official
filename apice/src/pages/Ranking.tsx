import { Award, Lock, Medal, TrendingUp, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GraficoCalorias, GraficoPeso, GraficoVolume } from '../components/Graficos'
import { Barra, Cartao, Chip, Estatistica, Etiqueta, TituloSecao, Vazio } from '../components/ui'
import { FiguraExercicio } from '../components/FiguraExercicio'
import { EXERCICIOS_POR_ID } from '../data/exercicios'
import { LIFTS_PRINCIPAIS, NOME_LIFT } from '../data/padroesForca'
import { CORES_NIVEL, CORES_TIER, NIVEIS, scoreGeral, tierDoScore } from '../lib/forca'
import { CONQUISTAS, CORES_TIER_CONQUISTA, nivelDoXp, tituloDoNivel } from '../lib/gamificacao'
import { contextoConquistas, diasAtras, metasDe, recordes, totaisDoDia, useStore, volumeSemanal } from '../lib/store'

type Secao = 'forca' | 'evolucao' | 'conquistas'

export default function Ranking() {
  const [secao, setSecao] = useState<Secao>('forca')
  const estado = useStore()

  const prs = useMemo(() => recordes(estado), [estado])
  const percentis = Object.values(prs).map((p) => p.percentil).filter((p) => p > 0)
  const score = scoreGeral(percentis)
  const tier = tierDoScore(score)
  const nivel = nivelDoXp(estado.jogo.xp)

  return (
    <div className="space-y-5 pt-3">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-sm text-slate-400">Onde você está em relação a quem treina.</p>
      </header>

      {/* --------------------------- Score geral ---------------------------- */}
      <Cartao className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: CORES_TIER[tier] }}
        />
        <div className="relative flex items-center gap-5">
          <div
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2"
            style={{ borderColor: `${CORES_TIER[tier]}66`, backgroundColor: `${CORES_TIER[tier]}14` }}
          >
            <Trophy size={20} style={{ color: CORES_TIER[tier] }} />
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: CORES_TIER[tier] }}>
              {tier}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Score geral de força</p>
            <p className="text-3xl font-bold tabular-nums">
              {score.toFixed(0)}
              <span className="text-base font-normal text-slate-500">/100</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {percentis.length > 0
                ? `Média dos seus ${Math.min(5, percentis.length)} melhores levantamentos`
                : 'Registre séries nos levantamentos principais para pontuar'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-3.5 text-center">
          <Estatistica rotulo="Nível" valor={nivel.nivel} />
          <Estatistica rotulo="Título" valor={tituloDoNivel(nivel.nivel)} />
          <Estatistica rotulo="Sequência" valor={estado.jogo.streakAtual} sufixo="d" />
        </div>
      </Cartao>

      <div className="flex gap-2">
        <Chip ativo={secao === 'forca'} onClick={() => setSecao('forca')}>
          Força
        </Chip>
        <Chip ativo={secao === 'evolucao'} onClick={() => setSecao('evolucao')}>
          Evolução
        </Chip>
        <Chip ativo={secao === 'conquistas'} onClick={() => setSecao('conquistas')}>
          Conquistas
        </Chip>
      </div>

      {secao === 'forca' && <SecaoForca />}
      {secao === 'evolucao' && <SecaoEvolucao />}
      {secao === 'conquistas' && <SecaoConquistas />}
    </div>
  )
}

// ---------------------------------------------------------------------------

function SecaoForca() {
  const estado = useStore()
  const prs = useMemo(() => recordes(estado), [estado])

  // Melhor marca por levantamento de referência. Um mesmo lift pode ter sido
  // treinado em várias variações, então a carga é convertida para a escala do
  // levantamento base antes de comparar — 347 kg de leg press valem ~173 kg de
  // agachamento, e é esse número que faz sentido exibir sob "Agachamento livre".
  const porLift = useMemo(() => {
    const mapa: Record<
      string,
      { percentil: number; equivalente: number; exercicioId: string; convertido: boolean }
    > = {}
    for (const pr of Object.values(prs)) {
      const ex = EXERCICIOS_POR_ID[pr.exercicioId]
      if (!ex?.ref || pr.percentil <= 0) continue
      const atual = mapa[ex.ref.lift]
      if (!atual || pr.percentil > atual.percentil) {
        mapa[ex.ref.lift] = {
          percentil: pr.percentil,
          equivalente: pr.e1rm / ex.ref.coef,
          exercicioId: pr.exercicioId,
          convertido: ex.ref.coef !== 1,
        }
      }
    }
    return mapa
  }, [prs])

  const todosPrs = Object.values(prs).sort((a, b) => b.percentil - a.percentil)

  if (todosPrs.length === 0) {
    return (
      <Vazio
        icone={<Medal size={32} />}
        titulo="Sem recordes ainda"
        texto="Registre séries no treino — cada uma é comparada automaticamente com a população treinada."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <TituloSecao>Levantamentos principais</TituloSecao>
        <p className="mb-2.5 text-[11px] leading-relaxed text-slate-500">
          Cargas feitas em variações são convertidas para a escala do levantamento base (marcadas com ~) antes de
          entrar na comparação.
        </p>
        <div className="space-y-2.5">
          {LIFTS_PRINCIPAIS.map((lift) => {
            const d = porLift[lift]
            const nivel = d ? nivelPorPercentil(d.percentil) : null
            return (
              <Cartao key={lift} className="py-3">
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-[15px] font-medium">{NOME_LIFT[lift]}</p>
                    {d && (
                      <p className="truncate text-[11px] text-slate-500">
                        {d.convertido ? 'convertido de' : 'via'} {EXERCICIOS_POR_ID[d.exercicioId]?.nome}
                      </p>
                    )}
                  </div>
                  {d ? (
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">
                        {d.convertido && <span className="text-xs font-normal text-slate-500">~</span>}
                        {d.equivalente.toFixed(0)} kg
                      </p>
                      <p className="text-[11px] tabular-nums text-slate-500">
                        top {Math.max(0.1, 100 - d.percentil).toFixed(0)}%
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">sem registro</span>
                  )}
                </div>
                <Barra
                  valor={d?.percentil ?? 0}
                  meta={100}
                  cor={nivel ? CORES_NIVEL[nivel] : '#333949'}
                />
                {nivel && (
                  <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wide text-slate-600">
                    {NIVEIS.map((n) => (
                      <span key={n} style={n === nivel ? { color: CORES_NIVEL[n], fontWeight: 700 } : undefined}>
                        {n.slice(0, 5)}
                      </span>
                    ))}
                  </div>
                )}
              </Cartao>
            )
          })}
        </div>
      </div>

      <div>
        <TituloSecao>Todos os recordes ({todosPrs.length})</TituloSecao>
        <div className="space-y-1.5">
          {todosPrs.map((pr) => {
            const ex = EXERCICIOS_POR_ID[pr.exercicioId]
            const nivel = pr.percentil > 0 ? nivelPorPercentil(pr.percentil) : null
            return (
              <div
                key={pr.exercicioId}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
              >
                {ex && (
                  <FiguraExercicio
                    exercicio={ex}
                    tamanho={36}
                    className="shrink-0 rounded-lg bg-white/[0.04] text-slate-400"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{ex?.nome ?? pr.exercicioId}</p>
                  <p className="text-[11px] text-slate-500">
                    {pr.peso > 0 ? `${pr.peso} kg` : 'peso corporal'} × {pr.reps} ·{' '}
                    {new Date(`${pr.data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{pr.e1rm.toFixed(0)} kg</p>
                  {nivel && <Etiqueta cor={CORES_NIVEL[nivel]}>{nivel}</Etiqueta>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function SecaoEvolucao() {
  const estado = useStore()
  const metas = useMemo(() => metasDe(estado), [estado])

  const dadosPeso = useMemo(
    () =>
      [...estado.pesos]
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(-40)
        .map((p) => ({
          rotulo: new Date(`${p.data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          peso: p.peso,
        })),
    [estado.pesos],
  )

  const dadosVolume = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const semanasAtras = 7 - i
        return {
          rotulo: semanasAtras === 0 ? 'agora' : `-${semanasAtras}s`,
          volume: Math.round(volumeSemanal(estado, semanasAtras)),
        }
      }),
    [estado],
  )

  const dadosKcal = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const dia = diasAtras(13 - i)
        return {
          rotulo: new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit' }),
          kcal: Math.round(totaisDoDia(estado, dia).kcal),
        }
      }),
    [estado],
  )

  const temAlgo =
    dadosPeso.length >= 2 || dadosVolume.some((d) => d.volume > 0) || dadosKcal.some((d) => d.kcal > 0)

  if (!temAlgo) {
    return (
      <Vazio
        icone={<TrendingUp size={32} />}
        titulo="Ainda sem histórico"
        texto="Os gráficos aparecem depois de alguns dias de registro."
      />
    )
  }

  return (
    <div className="space-y-6">
      <Cartao>
        <GraficoCalorias dados={dadosKcal} meta={metas.kcal} />
      </Cartao>
      <Cartao>
        <GraficoVolume dados={dadosVolume} />
      </Cartao>
      {dadosPeso.length >= 2 && (
        <Cartao>
          <GraficoPeso dados={dadosPeso} />
        </Cartao>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function SecaoConquistas() {
  const estado = useStore()
  const ctx = useMemo(() => contextoConquistas(estado), [estado])
  const desbloqueadas = estado.jogo.conquistas

  const ordenadas = [...CONQUISTAS].sort((a, b) => {
    const da = desbloqueadas[a.id] ? 0 : 1
    const db = desbloqueadas[b.id] ? 0 : 1
    return da - db
  })

  const total = CONQUISTAS.length
  const feitas = Object.keys(desbloqueadas).length

  return (
    <div className="space-y-4">
      <Cartao>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-slate-300">
            <Award size={15} className="mr-1.5 inline text-amber-400" />
            {feitas} de {total} desbloqueadas
          </span>
          <span className="text-sm font-semibold tabular-nums">{Math.round((feitas / total) * 100)}%</span>
        </div>
        <Barra valor={feitas} meta={total} cor="#e9b949" />
      </Cartao>

      <div className="grid grid-cols-2 gap-2.5">
        {ordenadas.map((c) => {
          const feita = !!desbloqueadas[c.id]
          const cor = CORES_TIER_CONQUISTA[c.tier]
          return (
            <div
              key={c.id}
              className="rounded-xl border p-3 transition"
              style={{
                borderColor: feita ? `${cor}44` : 'rgba(255,255,255,0.06)',
                backgroundColor: feita ? `${cor}0e` : 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="mb-1.5 flex items-start justify-between">
                <span className={feita ? 'text-2xl' : 'text-2xl opacity-25 grayscale'}>{c.icone}</span>
                {!feita && <Lock size={13} className="mt-1 text-slate-600" />}
              </div>
              <p className={feita ? 'text-sm font-semibold' : 'text-sm font-medium text-slate-500'}>{c.nome}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{c.descricao}</p>
              {feita && (
                <p className="mt-1.5 text-[10px] uppercase tracking-wide" style={{ color: cor }}>
                  {c.tier}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <Cartao className="text-xs text-slate-500">
        <p className="mb-2 font-medium text-slate-400">Seus números</p>
        <div className="grid grid-cols-2 gap-y-1.5">
          <span>Treinos: {ctx.totalTreinos}</span>
          <span>Séries: {ctx.totalSeries}</span>
          <span>Refeições: {ctx.totalRefeicoes}</span>
          <span>Fotos analisadas: {ctx.totalFotos}</span>
          <span>Melhor percentil: {ctx.melhorPercentil.toFixed(0)}</span>
          <span>Grupos treinados: {ctx.gruposTreinados}</span>
        </div>
      </Cartao>
    </div>
  )
}

function nivelPorPercentil(p: number) {
  if (p >= 95) return 'Elite' as const
  if (p >= 80) return 'Avançado' as const
  if (p >= 50) return 'Intermediário' as const
  if (p >= 20) return 'Novato' as const
  return 'Iniciante' as const
}
