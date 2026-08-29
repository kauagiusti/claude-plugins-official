import { CalendarDays, Plus, RefreshCw, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { restante } from '../lib/nutricao'
import {
  NOME_MOMENTO,
  momentoDaHora,
  planoDoDia,
  sementeDoDia,
  sugerirRefeicao,
  totaisDoPlano,
  type Momento,
  type SugestaoRefeicao,
} from '../lib/refeicoes'
import { horaAgora, metasDe, refeicoesDoDia, totaisDoDia, useStore } from '../lib/store'
import type { Macros, TipoRefeicao } from '../types'
import { Botao, Cartao, Painel, TituloSecao } from './ui'

/** O momento do plano vira o tipo de refeição do diário. */
const TIPO_DO_MOMENTO: Record<Momento, TipoRefeicao> = {
  cafe: 'cafe',
  lanche_manha: 'lanche_manha',
  almoco: 'almoco',
  lanche_tarde: 'lanche_tarde',
  jantar: 'jantar',
  ceia: 'ceia',
}

/**
 * Sugestão de prato para a próxima refeição, e o plano do resto do dia.
 *
 * A sugestão é montada a partir do que falta nas metas e do que já foi comido
 * hoje — comer frango no almoço tira o frango do jantar. "Trocar" sorteia outro
 * prato; a semente vem da data, então a sugestão não fica pulando sozinha entre
 * uma renderização e outra.
 */
export function SugestaoPrato({ data }: { data: string }) {
  const estado = useStore()
  const addRefeicao = useStore((s) => s.addRefeicao)

  const [rodada, setRodada] = useState(0)
  const [planoAberto, setPlanoAberto] = useState(false)

  const metas = useMemo(() => metasDe(estado), [estado])
  const consumido = useMemo(() => totaisDoDia(estado, data), [estado, data])
  const refeicoes = useMemo(() => refeicoesDoDia(estado, data), [estado, data])

  const agora = new Date()
  const hora = agora.getHours() + agora.getMinutes() / 60
  const falta = restante(consumido, metas)

  // Nada de sugerir o que a pessoa já comeu hoje.
  const comidos = useMemo(
    () => new Set(refeicoes.flatMap((r) => r.itens.map((i) => i.nome))),
    [refeicoes],
  )

  const momento = momentoDaHora(hora)
  const semente = sementeDoDia(`${data}-${momento}`, rodada)

  const sugestao = useMemo(
    () =>
      sugerirRefeicao(
        momento,
        {
          // O que falta, dividido pelas refeições que ainda cabem — com um piso,
          // porque mesmo o dia estourado precisa de uma sugestão comível.
          kcal: Math.max(250, falta.kcal * (momento === 'almoco' || momento === 'jantar' ? 0.45 : 0.25)),
          proteina: Math.max(15, falta.proteina * (momento === 'almoco' || momento === 'jantar' ? 0.4 : 0.25)),
        },
        semente,
        comidos,
      ),
    [momento, falta.kcal, falta.proteina, semente, comidos],
  )

  const plano = useMemo(
    () => planoDoDia(falta, hora, sementeDoDia(data, rodada), comidos),
    // A hora entra arredondada: recalcular o plano a cada minuto trocaria o
    // almoço debaixo do dedo de quem está lendo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, rodada, comidos, Math.floor(hora), falta.kcal, falta.proteina],
  )

  function adicionar(r: SugestaoRefeicao) {
    addRefeicao({
      data,
      hora: horaAgora(),
      tipo: TIPO_DO_MOMENTO[r.momento],
      titulo: r.nome,
      origem: 'tabela',
      itens: r.itens.map((i) => {
        const k = i.gramas / 100
        return {
          nome: i.alimento.nome,
          quantidade: i.gramas,
          unidade: 'g' as const,
          porcaoDescrita: i.medida,
          kcal: Math.round(i.alimento.kcal * k),
          proteina: +(i.alimento.proteina * k).toFixed(1),
          carbo: +(i.alimento.carbo * k).toFixed(1),
          gordura: +(i.alimento.gordura * k).toFixed(1),
          fibra: +(i.alimento.fibra * k).toFixed(1),
          sodio: i.alimento.sodio ? Math.round(i.alimento.sodio * k) : undefined,
        }
      }),
    })
  }

  return (
    <>
      <Cartao className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Sugestão para o {NOME_MOMENTO[momento].toLowerCase()}
            </p>
            <p className="font-semibold leading-tight">{sugestao.nome}</p>
          </div>
          <button
            onClick={() => setRodada((r) => r + 1)}
            aria-label="Sugerir outro prato"
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-lime"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <ItensDoPrato sugestao={sugestao} />
        <MacrosDoPrato macros={sugestao.macros} />

        <div className="flex gap-2">
          <Botao className="flex-1 py-2.5 text-sm" onClick={() => adicionar(sugestao)}>
            <Plus size={16} /> Adicionar ao dia
          </Botao>
          <Botao variante="secundario" className="py-2.5 text-sm" onClick={() => setPlanoAberto(true)}>
            <CalendarDays size={16} /> Plano do dia
          </Botao>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500">
          Montado com a tabela de alimentos do app, a partir do que falta nas suas metas e do que você já comeu
          hoje. Quantidades são ponto de partida — ajuste depois de adicionar.
        </p>
      </Cartao>

      <Painel aberto={planoAberto} aoFechar={() => setPlanoAberto(false)} titulo="Plano do resto do dia">
        <PlanoCompleto
          plano={plano}
          metas={metas}
          aoAdicionar={adicionar}
          aoTrocar={() => setRodada((r) => r + 1)}
        />
      </Painel>
    </>
  )
}

function ItensDoPrato({ sugestao }: { sugestao: SugestaoRefeicao }) {
  return (
    <ul className="space-y-1.5">
      {sugestao.itens.map((i) => (
        <li key={i.alimento.id} className="flex items-baseline gap-2 text-sm">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime/60" />
          <span className="text-slate-200">{i.alimento.nome}</span>
          <span className="ml-auto shrink-0 tabular-nums text-slate-500">{i.medida}</span>
        </li>
      ))}
    </ul>
  )
}

function MacrosDoPrato({ macros }: { macros: Macros }) {
  const campos: [string, string, string][] = [
    ['kcal', String(Math.round(macros.kcal)), '#ffffff'],
    ['P', `${macros.proteina.toFixed(0)}g`, '#4ec3f2'],
    ['C', `${macros.carbo.toFixed(0)}g`, '#c6f24e'],
    ['G', `${macros.gordura.toFixed(0)}g`, '#ff7a45'],
    ['Fibra', `${macros.fibra.toFixed(0)}g`, '#a78bfa'],
  ]
  return (
    <div className="grid grid-cols-5 gap-1 rounded-xl bg-black/25 p-2.5 text-center">
      {campos.map(([rotulo, valor, cor]) => (
        <div key={rotulo}>
          <p className="text-[10px] uppercase text-slate-500">{rotulo}</p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: cor }}>
            {valor}
          </p>
        </div>
      ))}
    </div>
  )
}

function PlanoCompleto({
  plano,
  metas,
  aoAdicionar,
  aoTrocar,
}: {
  plano: SugestaoRefeicao[]
  metas: { kcal: number; proteina: number }
  aoAdicionar: (r: SugestaoRefeicao) => void
  aoTrocar: () => void
}) {
  const [adicionados, setAdicionados] = useState<Set<Momento>>(new Set())
  const totais = totaisDoPlano(plano)

  if (plano.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        O dia já passou de todas as refeições. Amanhã o plano volta.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <Cartao className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">O plano inteiro entrega</p>
        <MacrosDoPrato macros={totais} />
        <p className="text-[11px] leading-relaxed text-slate-500">
          Contra a sua meta de {Math.round(metas.kcal)} kcal e {Math.round(metas.proteina)} g de proteína no dia —
          já descontando o que você comeu. Não é prescrição: é um ponto de partida montado com valores médios de
          tabela.
        </p>
      </Cartao>

      {plano.map((r) => (
        <div key={r.momento}>
          <TituloSecao>{NOME_MOMENTO[r.momento]}</TituloSecao>
          <Cartao className="space-y-3">
            <p className="font-medium">{r.nome}</p>
            <ItensDoPrato sugestao={r} />
            <MacrosDoPrato macros={r.macros} />
            <Botao
              variante="secundario"
              className="w-full py-2 text-sm"
              disabled={adicionados.has(r.momento)}
              onClick={() => {
                aoAdicionar(r)
                setAdicionados((s) => new Set(s).add(r.momento))
              }}
            >
              {adicionados.has(r.momento) ? (
                <>Adicionado</>
              ) : (
                <>
                  <Plus size={15} /> Adicionar esta refeição
                </>
              )}
            </Botao>
          </Cartao>
        </div>
      ))}

      <Botao variante="fantasma" className="w-full" onClick={aoTrocar}>
        <UtensilsCrossed size={16} /> Montar outro plano
      </Botao>
    </div>
  )
}
