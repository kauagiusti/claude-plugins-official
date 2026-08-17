import { Camera, ChevronRight, Dumbbell, Flame, Plus, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import type { Aba } from '../App'
import { Anel, Aviso, Barra, Botao, Cartao, Estatistica, TituloSecao } from '../components/ui'
import { EXERCICIOS_POR_ID } from '../data/exercicios'
import { nivelDoXp, streakVigente, tituloDoNivel } from '../lib/gamificacao'
import { recomendacaoLocal, restante, ROTULO_REFEICAO } from '../lib/nutricao'
import {
  hojeISO,
  metasDe,
  refeicoesDoDia,
  totaisDoDia,
  treinosDoDia,
  useStore,
  volumeDoTreino,
  volumeSemanal,
} from '../lib/store'
import { totaisRefeicao } from '../lib/nutricao'

export default function Hoje({ irPara }: { irPara: (a: Aba) => void }) {
  const estado = useStore()
  const perfil = estado.perfil

  const metas = useMemo(() => metasDe(estado), [estado])
  const consumido = useMemo(() => totaisDoDia(estado), [estado])
  const refeicoes = useMemo(() => refeicoesDoDia(estado), [estado])
  const treinos = useMemo(() => treinosDoDia(estado), [estado])
  const rec = useMemo(() => recomendacaoLocal(consumido, metas), [consumido, metas])
  const r = restante(consumido, metas)

  const nivel = nivelDoXp(estado.jogo.xp)
  const streak = streakVigente(estado.jogo, hojeISO())
  const volumeSemana = useMemo(() => volumeSemanal(estado, 0), [estado])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-5 pt-3">
      {/* -------------------------------- Topo ------------------------------ */}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{saudacao}</p>
          <h1 className="text-2xl font-bold tracking-tight">{perfil.nome || 'Vamos lá'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-flame/30 bg-flame/10 px-2.5 py-1">
              <Flame size={14} className="text-flame" />
              <span className="text-sm font-semibold tabular-nums text-flame">{streak}</span>
            </div>
          )}
          <div className="rounded-full border border-lime/30 bg-lime/10 px-2.5 py-1">
            <span className="text-sm font-semibold tabular-nums text-lime">Nv {nivel.nivel}</span>
          </div>
        </div>
      </header>

      {/* ------------------------------ Calorias ---------------------------- */}
      <Cartao>
        <div className="flex items-center gap-5">
          <Anel valor={consumido.kcal} meta={metas.kcal}>
            <span className="text-[26px] font-bold leading-none tabular-nums">{Math.round(consumido.kcal)}</span>
            <span className="mt-0.5 text-[11px] text-slate-500">de {metas.kcal} kcal</span>
          </Anel>

          <div className="min-w-0 flex-1 space-y-3">
            <MacroLinha rotulo="Proteína" valor={consumido.proteina} meta={metas.proteina} cor="#4ec3f2" />
            <MacroLinha rotulo="Carboidrato" valor={consumido.carbo} meta={metas.carbo} cor="#c6f24e" />
            <MacroLinha rotulo="Gordura" valor={consumido.gordura} meta={metas.gordura} cor="#ff7a45" />
            <MacroLinha rotulo="Fibra" valor={consumido.fibra} meta={metas.fibra} cor="#a78bfa" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-3.5 text-center">
          <Estatistica
            rotulo="Faltam"
            valor={Math.round(Math.max(0, r.kcal))}
            sufixo="kcal"
            cor={r.kcal < 0 ? '#ff7a45' : undefined}
          />
          <Estatistica rotulo="Proteína" valor={Math.round(Math.max(0, r.proteina))} sufixo="g" />
          <Estatistica rotulo="Refeições" valor={refeicoes.length} />
        </div>
      </Cartao>

      {/* --------------------------- Recomendação --------------------------- */}
      <div>
        <TituloSecao>Agora</TituloSecao>
        <Aviso tom={rec.tom}>
          <p className="font-semibold">{rec.titulo}</p>
          <p className="mt-1 text-slate-300">{rec.texto}</p>
          {rec.sugestoes.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {rec.sugestoes.map((s) => (
                <div key={s.nome} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-slate-200">
                    {s.nome} <span className="text-slate-500">· {s.quantidade}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-slate-400">{s.ganho}</span>
                </div>
              ))}
            </div>
          )}
        </Aviso>
      </div>

      {/* ------------------------------ Atalhos ----------------------------- */}
      <div className="grid grid-cols-2 gap-3">
        <Botao onClick={() => irPara('nutricao')} className="py-3.5">
          <Camera size={18} /> Fotografar
        </Botao>
        <Botao variante="secundario" onClick={() => irPara('treino')} className="py-3.5">
          <Dumbbell size={18} /> {estado.treinoAtivo ? 'Continuar treino' : 'Treinar'}
        </Botao>
      </div>

      {/* ---------------------------- Refeições ----------------------------- */}
      <div>
        <TituloSecao
          acao={
            <button onClick={() => irPara('nutricao')} className="flex items-center text-xs text-lime">
              ver tudo <ChevronRight size={14} />
            </button>
          }
        >
          Refeições de hoje
        </TituloSecao>
        {refeicoes.length === 0 ? (
          <Cartao className="flex items-center gap-3 text-sm text-slate-400">
            <Plus size={18} className="text-slate-600" />
            Nada registrado ainda. Fotografe a primeira refeição do dia.
          </Cartao>
        ) : (
          <div className="space-y-2">
            {refeicoes.map((r) => {
              const t = totaisRefeicao(r)
              return (
                <Cartao key={r.id} className="flex items-center gap-3 py-3">
                  {r.fotoDataUrl ? (
                    <img src={r.fotoDataUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">
                      🍽️
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{r.titulo}</p>
                    <p className="text-xs text-slate-500">
                      {r.hora} · {ROTULO_REFEICAO[r.tipo]}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums">{Math.round(t.kcal)}</p>
                    <p className="text-[11px] text-slate-500">
                      P{Math.round(t.proteina)} C{Math.round(t.carbo)} G{Math.round(t.gordura)}
                    </p>
                  </div>
                </Cartao>
              )
            })}
          </div>
        )}
      </div>

      {/* ------------------------------ Treino ------------------------------ */}
      <div>
        <TituloSecao>Treino</TituloSecao>
        {estado.treinoAtivo ? (
          <Cartao onClick={() => irPara('treino')} className="border-lime/30 bg-lime/[0.06]">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-lime" />
              <div className="flex-1">
                <p className="font-medium text-lime">{estado.treinoAtivo.nome} em andamento</p>
                <p className="text-xs text-slate-400">
                  {estado.treinoAtivo.exercicios.length} exercício(s) ·{' '}
                  {estado.treinoAtivo.exercicios.reduce((a, e) => a + e.series.filter((s) => s.concluida).length, 0)}{' '}
                  séries feitas
                </p>
              </div>
              <ChevronRight size={18} className="text-lime" />
            </div>
          </Cartao>
        ) : treinos.length > 0 ? (
          treinos.map((t) => (
            <Cartao key={t.id} className="mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.nome}</p>
                  <p className="text-xs text-slate-500">
                    {t.exercicios
                      .map((e) => EXERCICIOS_POR_ID[e.exercicioId]?.nome)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(' · ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">
                    {Math.round(volumeDoTreino(t, perfil.pesoKg)).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[11px] text-slate-500">kg de volume</p>
                </div>
              </div>
            </Cartao>
          ))
        ) : (
          <Cartao className="flex items-center gap-3 text-sm text-slate-400">
            <Dumbbell size={18} className="text-slate-600" />
            Nenhum treino hoje. Um treino curto conta mais que um treino perfeito que não aconteceu.
          </Cartao>
        )}
      </div>

      {/* ------------------------------ Números ----------------------------- */}
      <div>
        <TituloSecao>Semana</TituloSecao>
        <Cartao className="grid grid-cols-3 gap-3">
          <Estatistica
            rotulo="Volume"
            valor={volumeSemana >= 1000 ? `${(volumeSemana / 1000).toFixed(1)}t` : Math.round(volumeSemana)}
          />
          <Estatistica rotulo="Sequência" valor={streak} sufixo="dias" />
          <Estatistica rotulo="Nível" valor={tituloDoNivel(nivel.nivel)} />
          <div className="col-span-3">
            <div className="mb-1 flex justify-between text-[11px] text-slate-500">
              <span>
                {estado.jogo.xp.toLocaleString('pt-BR')} XP · nível {nivel.nivel}
              </span>
              <span>{nivel.proximo.toLocaleString('pt-BR')} XP</span>
            </div>
            <Barra valor={nivel.progresso * 100} meta={100} />
          </div>
        </Cartao>
      </div>

      <button
        onClick={() => irPara('ranking')}
        className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-lime"
      >
        <TrendingUp size={16} /> Ver ranking e conquistas
      </button>
    </div>
  )
}

function MacroLinha({ rotulo, valor, meta, cor }: { rotulo: string; valor: number; meta: number; cor: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-slate-400">{rotulo}</span>
        <span className="tabular-nums text-slate-300">
          <span className="font-semibold" style={{ color: cor }}>
            {Math.round(valor)}
          </span>
          <span className="text-slate-600"> / {Math.round(meta)} g</span>
        </span>
      </div>
      <Barra valor={valor} meta={meta} cor={cor} />
    </div>
  )
}
