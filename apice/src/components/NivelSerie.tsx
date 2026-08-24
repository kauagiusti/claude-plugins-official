import { TrendingUp } from 'lucide-react'
import { CORES_NIVEL, NIVEIS, REPS_CONFIAVEIS } from '../lib/forca'
import type { ClassificacaoForca } from '../types'
import { Etiqueta } from './ui'

/**
 * Onde a série se posiciona em relação à população treinada. É o retorno
 * imediato depois de registrar — o motivo pelo qual a pessoa volta.
 */
export function NivelSerie({
  cls,
  reps,
  compacto,
}: {
  cls: ClassificacaoForca
  reps?: number
  compacto?: boolean
}) {
  const cor = CORES_NIVEL[cls.nivel]
  const topo = Math.max(0.1, 100 - cls.percentil)

  if (compacto) {
    return (
      <div className="flex items-center gap-1.5">
        <Etiqueta cor={cor}>{cls.nivel}</Etiqueta>
        <span className="text-[11px] tabular-nums text-slate-500">top {topo.toFixed(0)}%</span>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border p-3.5" style={{ borderColor: `${cor}44`, backgroundColor: `${cor}0e` }}>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Seu nível</p>
          <p className="text-xl font-bold" style={{ color: cor }}>
            {cls.nivel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Mundial</p>
          <p className="text-xl font-bold tabular-nums">
            top {topo < 1 ? topo.toFixed(1) : topo.toFixed(0)}%
          </p>
        </div>
      </div>

      <EscalaNiveis cls={cls} />

      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        <div>
          <p className="text-slate-500">1RM estimado</p>
          <p className="font-semibold tabular-nums text-slate-200">{cls.e1rm.toFixed(1)} kg</p>
        </div>
        <div>
          <p className="text-slate-500">Do seu peso</p>
          <p className="font-semibold tabular-nums text-slate-200">{cls.vsPeso.toFixed(2)}×</p>
        </div>
        <div>
          <p className="text-slate-500">Vs. média</p>
          <p
            className="font-semibold tabular-nums"
            style={{ color: cls.vsMedia >= 1 ? '#c6f24e' : '#94a3b8' }}
          >
            {cls.vsMedia >= 1 ? '+' : ''}
            {((cls.vsMedia - 1) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {cls.proximoNivel && cls.proximoNivel.faltamKg > 0 && (
        <p className="flex items-center gap-1.5 text-[12px] text-slate-400">
          <TrendingUp size={13} />
          Faltam <strong className="text-slate-200">{cls.proximoNivel.faltamKg.toFixed(1)} kg</strong> de 1RM para{' '}
          <span style={{ color: CORES_NIVEL[cls.proximoNivel.nivel] }}>{cls.proximoNivel.nivel}</span>.
        </p>
      )}

      <BaseDaComparacao cls={cls} />

      {(cls.estimado || (reps ?? 0) > REPS_CONFIAVEIS) && (
        <p className="text-[11px] leading-relaxed text-slate-500">
          {cls.estimado && 'Padrões convertidos a partir do levantamento de referência. '}
          {(reps ?? 0) > REPS_CONFIAVEIS &&
            `Acima de ${REPS_CONFIAVEIS} repetições a estimativa de 1RM satura — o número real tende a ser maior.`}
        </p>
      )}
    </div>
  )
}

/**
 * De onde saiu o padrão contra o qual a série foi medida. Sem isso o percentil
 * vira número mágico — e ele é resultado de escolhas que dá para checar.
 */
function BaseDaComparacao({ cls }: { cls: ClassificacaoForca }) {
  const partes: string[] = []
  const pct = (f: number) => `${f > 1 ? '+' : '−'}${Math.abs((f - 1) * 100).toFixed(1)}%`

  if (Math.abs(cls.ajustes.idade - 1) > 0.001) partes.push(`idade ${pct(cls.ajustes.idade)}`)
  if (Math.abs(cls.ajustes.altura - 1) > 0.001) {
    partes.push(`altura ${pct(cls.ajustes.altura)} (típica no seu peso: ${cls.ajustes.alturaReferenciaCm.toFixed(0)} cm)`)
  }
  if (partes.length === 0) return null

  return (
    <p className="text-[11px] leading-relaxed text-slate-500">
      Padrão do seu peso e sexo, ajustado por {partes.join(' · ')}.
      {Math.abs(cls.ajustes.altura - 1) > 0.001 && ' O de altura é modelo mecânico — dá para desligar em Ajustes.'}
    </p>
  )
}

/** Régua dos cinco níveis com a posição atual marcada. */
function EscalaNiveis({ cls }: { cls: ClassificacaoForca }) {
  const max = cls.limiares.Elite * 1.18
  const pos = Math.min(100, (cls.e1rm / max) * 100)

  return (
    <div className="pt-1">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        {NIVEIS.map((n, i) => {
          const inicio = (cls.limiares[n] / max) * 100
          const fim = i < NIVEIS.length - 1 ? (cls.limiares[NIVEIS[i + 1]] / max) * 100 : 100
          return (
            <div
              key={n}
              className="absolute inset-y-0"
              style={{
                left: `${inicio}%`,
                width: `${Math.max(0, fim - inicio)}%`,
                backgroundColor: `${CORES_NIVEL[n]}55`,
              }}
            />
          )
        })}
        <div
          className="absolute inset-y-0 w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          style={{ left: `calc(${pos}% - 1.5px)` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-wide text-slate-600">
        {NIVEIS.map((n) => (
          <span key={n} style={cls.nivel === n ? { color: CORES_NIVEL[n], fontWeight: 700 } : undefined}>
            {n.slice(0, 5)}
          </span>
        ))}
      </div>
    </div>
  )
}
