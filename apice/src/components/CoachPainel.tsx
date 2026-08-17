import { Send, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EXERCICIOS_POR_ID } from '../data/exercicios'
import { mensagemDeErro, perguntarCoach } from '../lib/claude'
import { NOME_LIFT, scoreGeral } from '../lib/forca'
import { restante, ROTULO_OBJETIVO } from '../lib/nutricao'
import {
  hojeISO,
  metasDe,
  recordes,
  refeicoesDoDia,
  totaisDoDia,
  treinosDoDia,
  useStore,
  volumeSemanal,
} from '../lib/store'
import { Aviso, Botao, Painel } from './ui'

const SUGESTOES = [
  'O que jantar hoje pra bater a proteína?',
  'Monte meu treino de amanhã',
  'Meu supino está estagnado, o que fazer?',
  'Como está minha semana?',
]

export function CoachPainel({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  const apiKey = useStore((s) => s.apiKey)
  const mensagens = useStore((s) => s.coach)
  const addMensagem = useStore((s) => s.addMensagemCoach)
  const atualizarMensagem = useStore((s) => s.atualizarMensagemCoach)
  const limpar = useStore((s) => s.limparCoach)
  const estado = useStore()

  const contexto = useMemo(() => montarContexto(estado), [estado])

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, aberto])

  async function enviar(pergunta: string) {
    const q = pergunta.trim()
    if (!q || enviando) return
    setErro(null)
    setTexto('')
    setEnviando(true)

    addMensagem({ papel: 'user', texto: q, em: new Date().toISOString() })
    const idResposta = addMensagem({ papel: 'assistant', texto: '', em: new Date().toISOString() })

    try {
      const historico = [
        ...useStore
          .getState()
          .coach.filter((m) => m.id !== idResposta && m.texto)
          .map((m) => ({ role: m.papel, content: m.texto })),
      ]
      let acumulado = ''
      await perguntarCoach(apiKey, historico, contexto, (delta) => {
        acumulado += delta
        atualizarMensagem(idResposta, acumulado)
      })
    } catch (e) {
      setErro(mensagemDeErro(e))
      atualizarMensagem(idResposta, '')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Painel aberto={aberto} aoFechar={aoFechar} titulo="Coach">
      <div className="flex min-h-[55vh] flex-col">
        {!apiKey && (
          <Aviso tom="info">
            O coach precisa da sua chave da Claude API. Configure em <strong>Ajustes › Análise por foto</strong>.
          </Aviso>
        )}

        <div className="flex-1 space-y-3 py-2">
          {mensagens.length === 0 && (
            <div className="py-6 text-center">
              <Sparkles size={26} className="mx-auto mb-3 text-lime" />
              <p className="text-sm text-slate-400">
                Pergunte sobre alimentação, treino ou progresso. O coach já enxerga seus números de hoje.
              </p>
              <div className="mt-5 space-y-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    disabled={!apiKey}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left
                               text-sm text-slate-300 transition hover:border-lime/30 hover:text-white
                               disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensagens.map((m) => (
            <div key={m.id} className={m.papel === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.papel === 'user'
                    ? 'max-w-[85%] rounded-2xl rounded-br-md bg-lime px-3.5 py-2.5 text-[15px] text-ink-950'
                    : 'max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-ink-800 px-3.5 py-2.5 text-[15px] leading-relaxed text-slate-200'
                }
              >
                {m.texto || (
                  <span className="inline-flex gap-1 py-1">
                    <Ponto atraso={0} />
                    <Ponto atraso={150} />
                    <Ponto atraso={300} />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={fimRef} />
        </div>

        {erro && (
          <div className="pb-2">
            <Aviso tom="alerta">{erro}</Aviso>
          </div>
        )}

        <div className="sticky bottom-0 -mx-5 border-t border-white/[0.07] bg-ink-900 px-5 pb-1 pt-3">
          <div className="flex gap-2">
            {mensagens.length > 0 && (
              <Botao variante="fantasma" onClick={limpar} className="px-3" aria-label="Limpar conversa">
                <Trash2 size={17} />
              </Botao>
            )}
            <input
              className="campo flex-1"
              placeholder={apiKey ? 'Pergunte alguma coisa…' : 'Configure a chave em Ajustes'}
              value={texto}
              disabled={!apiKey}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar(texto)}
            />
            <Botao onClick={() => enviar(texto)} disabled={!texto.trim() || enviando || !apiKey} className="px-3.5">
              <Send size={17} />
            </Botao>
          </div>
        </div>
      </div>
    </Painel>
  )
}

function Ponto({ atraso }: { atraso: number }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500"
      style={{ animationDelay: `${atraso}ms` }}
    />
  )
}

/**
 * Snapshot do estado do app em texto. É o que separa uma resposta genérica de
 * uma resposta sobre a pessoa — vai inteiro no system prompt.
 */
function montarContexto(s: ReturnType<typeof useStore.getState>): string {
  const metas = metasDe(s)
  const consumido = totaisDoDia(s)
  const r = restante(consumido, metas)
  const refeicoes = refeicoesDoDia(s)
  const treinosHoje = treinosDoDia(s)
  const prs = recordes(s)

  const melhores = Object.values(prs)
    .filter((p) => p.percentil > 0)
    .sort((a, b) => b.percentil - a.percentil)
    .slice(0, 6)
    .map((p) => {
      const ex = EXERCICIOS_POR_ID[p.exercicioId]
      const lift = ex?.ref ? NOME_LIFT[ex.ref.lift] : ''
      return `- ${ex?.nome ?? p.exercicioId}: 1RM estimado ${p.e1rm.toFixed(1)} kg (melhor série ${p.peso} kg × ${p.reps}), percentil ${p.percentil.toFixed(0)}${lift ? ` [ref: ${lift}]` : ''}`
    })

  const score = scoreGeral(Object.values(prs).map((p) => p.percentil).filter((p) => p > 0))

  const ultimosTreinos = s.treinos
    .slice(-4)
    .reverse()
    .map((t) => {
      const nomes = t.exercicios
        .map((e) => EXERCICIOS_POR_ID[e.exercicioId]?.nome)
        .filter(Boolean)
        .slice(0, 6)
        .join(', ')
      return `- ${t.data}: ${t.nome} — ${nomes || 'sem exercícios'}`
    })

  return [
    `Pessoa: ${s.perfil.nome || 'sem nome'}, ${s.perfil.sexo === 'M' ? 'homem' : 'mulher'}, ${s.perfil.alturaCm} cm, ${s.perfil.pesoKg} kg.`,
    `Objetivo: ${ROTULO_OBJETIVO[s.perfil.objetivo]}. Data de hoje: ${hojeISO()}.`,
    '',
    `METAS DIÁRIAS: ${metas.kcal} kcal · ${metas.proteina} g proteína · ${metas.carbo} g carbo · ${metas.gordura} g gordura · ${metas.fibra} g fibra.`,
    `CONSUMIDO HOJE: ${Math.round(consumido.kcal)} kcal · ${Math.round(consumido.proteina)} g proteína · ${Math.round(consumido.carbo)} g carbo · ${Math.round(consumido.gordura)} g gordura · ${Math.round(consumido.fibra)} g fibra.`,
    `FALTA HOJE: ${Math.round(r.kcal)} kcal · ${Math.round(r.proteina)} g proteína · ${Math.round(r.carbo)} g carbo · ${Math.round(r.gordura)} g gordura.`,
    refeicoes.length
      ? `Refeições de hoje: ${refeicoes.map((x) => `${x.hora} ${x.titulo}`).join(' | ')}`
      : 'Nenhuma refeição registrada hoje.',
    '',
    treinosHoje.length ? `Treinou hoje: ${treinosHoje.map((t) => t.nome).join(', ')}.` : 'Ainda não treinou hoje.',
    s.treinoAtivo ? `TREINO EM ANDAMENTO agora: ${s.treinoAtivo.nome}.` : '',
    `Volume desta semana: ${Math.round(volumeSemanal(s, 0)).toLocaleString('pt-BR')} kg. Semana passada: ${Math.round(volumeSemanal(s, 1)).toLocaleString('pt-BR')} kg.`,
    `Sequência ativa: ${s.jogo.streakAtual} dias. Total de treinos registrados: ${s.treinos.length}.`,
    '',
    melhores.length ? `RECORDES (percentil na população treinada, ajustado por peso, sexo e idade):\n${melhores.join('\n')}` : 'Sem recordes registrados ainda.',
    score > 0 ? `Score geral de força: ${score.toFixed(0)}/100.` : '',
    '',
    ultimosTreinos.length ? `Últimos treinos:\n${ultimosTreinos.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
