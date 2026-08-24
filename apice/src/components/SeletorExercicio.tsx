import { Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { buscarExercicios, EQUIPAMENTOS, GRUPOS } from '../data/exercicios'
import { CORES_NIVEL } from '../lib/forca'
import { recordes, useStore } from '../lib/store'
import type { Equipamento, Exercicio, GrupoMuscular } from '../types'
import { Chip, Etiqueta, Painel, Vazio } from './ui'
import { FiguraExercicio } from './FiguraExercicio'

export function SeletorExercicio({
  aberto,
  aoFechar,
  aoEscolher,
}: {
  aberto: boolean
  aoFechar: () => void
  aoEscolher: (ex: Exercicio) => void
}) {
  const [termo, setTermo] = useState('')
  const [grupo, setGrupo] = useState<GrupoMuscular | null>(null)
  const [equipamento, setEquipamento] = useState<Equipamento | null>(null)

  const estado = useStore()
  const prs = useMemo(() => recordes(estado), [estado])

  const resultados = useMemo(
    () => buscarExercicios(termo, { grupo, equipamento }),
    [termo, grupo, equipamento],
  )

  // Exercícios já treinados sobem na lista: é o que a pessoa procura em 90% das vezes.
  const ordenados = useMemo(() => {
    return [...resultados].sort((a, b) => {
      const pa = prs[a.id] ? 1 : 0
      const pb = prs[b.id] ? 1 : 0
      if (pa !== pb) return pb - pa
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [resultados, prs])

  return (
    <Painel aberto={aberto} aoFechar={aoFechar} titulo="Escolher exercício">
      <div className="space-y-3">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="campo pl-10"
            placeholder="Supino, agachamento, polia…"
            value={termo}
            autoFocus
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip ativo={!grupo} onClick={() => setGrupo(null)}>
            Todos
          </Chip>
          {GRUPOS.map((g) => (
            <Chip key={g} ativo={grupo === g} onClick={() => setGrupo(grupo === g ? null : g)}>
              {g}
            </Chip>
          ))}
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip ativo={!equipamento} onClick={() => setEquipamento(null)}>
            Qualquer equipamento
          </Chip>
          {EQUIPAMENTOS.map((e) => (
            <Chip
              key={e.id}
              ativo={equipamento === e.id}
              onClick={() => setEquipamento(equipamento === e.id ? null : e.id)}
            >
              {e.nome}
            </Chip>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          {ordenados.length} exercício(s)
          {ordenados.length > 0 && ' · toque para adicionar ao treino'}
        </p>

        <div className="space-y-1.5 pb-2">
          {ordenados.length === 0 ? (
            <Vazio
              icone={<Search size={30} />}
              titulo="Nenhum exercício"
              texto="Tente outro termo ou remova os filtros."
            />
          ) : (
            ordenados.map((ex) => {
              const pr = prs[ex.id]
              return (
                <button
                  key={ex.id}
                  onClick={() => {
                    aoEscolher(ex)
                    aoFechar()
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02]
                             px-3.5 py-3 text-left transition hover:border-lime/30"
                >
                  <FiguraExercicio
                    exercicio={ex}
                    tamanho={42}
                    className="shrink-0 rounded-lg bg-white/[0.04] p-0.5 text-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">{ex.nome}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="rounded bg-white/5 px-1.5 py-0.5">{ex.grupo}</span>
                      <span>{EQUIPAMENTOS.find((e) => e.id === ex.equipamento)?.nome}</span>
                      {ex.ref && <span className="text-lime/60">tem ranking</span>}
                    </div>
                  </div>
                  {pr && (
                    <div className="shrink-0 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star size={11} className="text-amber-400" />
                        <span className="text-sm font-semibold tabular-nums">{pr.e1rm.toFixed(0)} kg</span>
                      </div>
                      {pr.percentil > 0 && (
                        <Etiqueta cor={CORES_NIVEL.Intermediário}>top {Math.round(100 - pr.percentil)}%</Etiqueta>
                      )}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </Painel>
  )
}
