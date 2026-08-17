import { Check, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { buscarAlimentos, CATEGORIAS_ALIMENTO } from '../data/alimentos'
import { porcaoDe, ROTULO_REFEICAO, somarMacros, tipoRefeicaoPorHora } from '../lib/nutricao'
import { horaAgora, useStore } from '../lib/store'
import type { AlimentoTabela, ItemAlimento, TipoRefeicao } from '../types'
import { Botao, Campo, Cartao, Chip, Painel, Selecao, Vazio } from './ui'

export function BuscaAlimento({
  aberto,
  aoFechar,
  data,
  refeicaoExistenteId,
}: {
  aberto: boolean
  aoFechar: () => void
  data: string
  /** Quando informado, os itens entram numa refeição já criada. */
  refeicaoExistenteId?: string
}) {
  const [termo, setTermo] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<AlimentoTabela | null>(null)
  const [gramas, setGramas] = useState(100)
  const [carrinho, setCarrinho] = useState<Omit<ItemAlimento, 'id'>[]>([])
  const [tipo, setTipo] = useState<TipoRefeicao>(tipoRefeicaoPorHora())

  const addRefeicao = useStore((s) => s.addRefeicao)
  const addItens = useStore((s) => s.addItens)

  const resultados = useMemo(() => buscarAlimentos(termo, categoria).slice(0, 60), [termo, categoria])
  const totais = useMemo(() => somarMacros(carrinho), [carrinho])

  function fechar() {
    setTermo('')
    setSelecionado(null)
    setCarrinho([])
    aoFechar()
  }

  function adicionarAoCarrinho() {
    if (!selecionado) return
    setCarrinho((c) => [...c, porcaoDe(selecionado, gramas)])
    setSelecionado(null)
    setTermo('')
    setGramas(100)
  }

  function salvar() {
    if (carrinho.length === 0) return
    if (refeicaoExistenteId) {
      addItens(refeicaoExistenteId, carrinho)
    } else {
      addRefeicao({
        data,
        hora: horaAgora(),
        tipo,
        titulo: carrinho.length === 1 ? carrinho[0].nome : `${ROTULO_REFEICAO[tipo]} (${carrinho.length} itens)`,
        itens: carrinho as ItemAlimento[],
        origem: 'tabela',
      })
    }
    fechar()
  }

  return (
    <Painel aberto={aberto} aoFechar={fechar} titulo={refeicaoExistenteId ? 'Adicionar itens' : 'Buscar alimento'}>
      <div className="space-y-3">
        {/* ------------------------ Item selecionado ----------------------- */}
        {selecionado ? (
          <div className="space-y-3">
            <Cartao>
              <p className="font-semibold">{selecionado.nome}</p>
              <p className="text-xs text-slate-500">
                Por 100 g: {selecionado.kcal} kcal · P {selecionado.proteina} · C {selecionado.carbo} · G{' '}
                {selecionado.gordura}
              </p>
            </Cartao>

            <Campo
              rotulo="Quantidade"
              type="number"
              inputMode="decimal"
              sufixo="g"
              value={gramas || ''}
              autoFocus
              onChange={(e) => setGramas(Number(e.target.value))}
            />

            <div className="flex flex-wrap gap-2">
              {selecionado.porcaoCaseira && (
                <Chip ativo={gramas === selecionado.porcaoCaseira.gramas} onClick={() => setGramas(selecionado.porcaoCaseira!.gramas)}>
                  {selecionado.porcaoCaseira.descricao} ({selecionado.porcaoCaseira.gramas} g)
                </Chip>
              )}
              {[50, 100, 150, 200].map((g) => (
                <Chip key={g} ativo={gramas === g} onClick={() => setGramas(g)}>
                  {g} g
                </Chip>
              ))}
            </div>

            <Cartao className="grid grid-cols-4 gap-2 text-center">
              {(() => {
                const p = porcaoDe(selecionado, gramas)
                return [
                  ['kcal', p.kcal, '#ffffff'],
                  ['P', `${p.proteina}g`, '#4ec3f2'],
                  ['C', `${p.carbo}g`, '#c6f24e'],
                  ['G', `${p.gordura}g`, '#ff7a45'],
                ].map(([rot, val, cor]) => (
                  <div key={rot as string}>
                    <p className="text-[11px] text-slate-500">{rot as string}</p>
                    <p className="font-bold tabular-nums" style={{ color: cor as string }}>
                      {val as string | number}
                    </p>
                  </div>
                ))
              })()}
            </Cartao>

            <div className="flex gap-2">
              <Botao variante="fantasma" onClick={() => setSelecionado(null)}>
                Voltar
              </Botao>
              <Botao onClick={adicionarAoCarrinho} className="flex-1" disabled={gramas <= 0}>
                <Plus size={17} /> Adicionar
              </Botao>
            </div>
          </div>
        ) : (
          <>
            {/* ---------------------------- Busca --------------------------- */}
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="campo pl-10"
                placeholder="Arroz, frango, whey…"
                value={termo}
                autoFocus
                onChange={(e) => setTermo(e.target.value)}
              />
            </div>

            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              <Chip ativo={!categoria} onClick={() => setCategoria(null)}>
                Todos
              </Chip>
              {CATEGORIAS_ALIMENTO.map((c) => (
                <Chip key={c} ativo={categoria === c} onClick={() => setCategoria(c)}>
                  {c}
                </Chip>
              ))}
            </div>

            <div className="space-y-1.5">
              {resultados.length === 0 ? (
                <Vazio
                  icone={<Search size={30} />}
                  titulo="Nada encontrado"
                  texto="Tente outro termo, ou use a análise por foto para alimentos fora da tabela."
                />
              ) : (
                resultados.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelecionado(a)
                      setGramas(a.porcaoCaseira?.gramas ?? 100)
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-white/[0.06]
                               bg-white/[0.02] px-3.5 py-2.5 text-left transition hover:border-lime/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px]">{a.nome}</p>
                      <p className="text-[11px] text-slate-500">
                        {a.kcal} kcal · P {a.proteina} · C {a.carbo} · G {a.gordura} — por 100 g
                      </p>
                    </div>
                    <Plus size={16} className="ml-2 shrink-0 text-slate-500" />
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* --------------------------- Carrinho ---------------------------- */}
        {carrinho.length > 0 && !selecionado && (
          <div className="sticky bottom-0 -mx-5 space-y-2 border-t border-white/[0.07] bg-ink-900 px-5 pb-1 pt-3">
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {carrinho.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-300">
                    {item.nome} <span className="text-slate-500">· {item.quantidade} g</span>
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-slate-400">{item.kcal} kcal</span>
                    <button
                      onClick={() => setCarrinho((c) => c.filter((_, idx) => idx !== i))}
                      className="text-slate-600 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!refeicaoExistenteId && (
              <Selecao value={tipo} onChange={(e) => setTipo(e.target.value as TipoRefeicao)}>
                {Object.entries(ROTULO_REFEICAO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Selecao>
            )}

            <Botao onClick={salvar} className="w-full">
              <Check size={17} /> Salvar {Math.round(totais.kcal)} kcal
            </Botao>
          </div>
        )}
      </div>
    </Painel>
  )
}
