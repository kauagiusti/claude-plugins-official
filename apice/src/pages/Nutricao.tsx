import { Barcode, Camera, ChevronLeft, ChevronRight, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AnalisadorFoto } from '../components/AnalisadorFoto'
import { BuscaAlimento } from '../components/BuscaAlimento'
import { EscanearProduto } from '../components/EscanearProduto'
import { Anel, Aviso, Barra, Botao, Cartao, Estatistica, TituloSecao, Vazio } from '../components/ui'
import { recomendacaoLocal, restante, ROTULO_REFEICAO, totaisRefeicao } from '../lib/nutricao'
import { diasAtras, hojeISO, metasDe, refeicoesDoDia, totaisDoDia, useStore } from '../lib/store'

/**
 * De onde vieram os números de cada refeição. Fica visível na lista porque a
 * confiabilidade não é a mesma: rótulo é declaração do fabricante, tabela é
 * valor médio, foto é estimativa.
 */
const PROCEDENCIA: Record<string, string> = {
  foto: 'Estimado a partir da foto',
  'codigo-barras': 'Rótulo do fabricante',
  tabela: 'Tabela de alimentos (valores médios)',
  manual: 'Informado por você',
}

export default function Nutricao() {
  const [data, setData] = useState(hojeISO())
  const [fotoAberta, setFotoAberta] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [scannerAberto, setScannerAberto] = useState(false)
  const [adicionarEm, setAdicionarEm] = useState<string | undefined>()
  const [expandida, setExpandida] = useState<string | null>(null)

  const estado = useStore()
  const removerRefeicao = useStore((s) => s.removerRefeicao)
  const removerItem = useStore((s) => s.removerItem)

  const metas = useMemo(() => metasDe(estado), [estado])
  const consumido = useMemo(() => totaisDoDia(estado, data), [estado, data])
  const refeicoes = useMemo(() => refeicoesDoDia(estado, data), [estado, data])
  const r = restante(consumido, metas)
  const ehHoje = data === hojeISO()
  const rec = useMemo(() => recomendacaoLocal(consumido, metas), [consumido, metas])

  function mudarDia(delta: number) {
    const d = new Date(`${data}T12:00:00`)
    d.setDate(d.getDate() + delta)
    const novo = hojeISO(d)
    if (novo > hojeISO()) return
    setData(novo)
  }

  return (
    <div className="space-y-5 pt-3">
      {/* -------------------------- Seletor de dia -------------------------- */}
      <header className="flex items-center justify-between">
        <button onClick={() => mudarDia(-1)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold">
            {ehHoje ? 'Hoje' : data === diasAtras(1) ? 'Ontem' : formatarData(data)}
          </h1>
          <p className="text-xs text-slate-500">{formatarData(data, true)}</p>
        </div>
        <button
          onClick={() => mudarDia(1)}
          disabled={ehHoje}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 disabled:opacity-25"
        >
          <ChevronRight size={20} />
        </button>
      </header>

      {/* ------------------------------ Resumo ------------------------------ */}
      <Cartao>
        <div className="flex items-center gap-5">
          <Anel valor={consumido.kcal} meta={metas.kcal} tamanho={116} espessura={10}>
            <span className="text-[22px] font-bold leading-none tabular-nums">{Math.round(consumido.kcal)}</span>
            <span className="text-[10px] text-slate-500">/ {metas.kcal}</span>
          </Anel>
          <div className="flex-1 space-y-2.5">
            {[
              ['Proteína', consumido.proteina, metas.proteina, '#4ec3f2'],
              ['Carbo', consumido.carbo, metas.carbo, '#c6f24e'],
              ['Gordura', consumido.gordura, metas.gordura, '#ff7a45'],
              ['Fibra', consumido.fibra, metas.fibra, '#a78bfa'],
            ].map(([rot, val, meta, cor]) => (
              <div key={rot as string}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-slate-400">{rot as string}</span>
                  <span className="tabular-nums text-slate-400">
                    {Math.round(val as number)}/{Math.round(meta as number)} g
                  </span>
                </div>
                <Barra valor={val as number} meta={meta as number} cor={cor as string} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-3.5 text-center">
          <Estatistica rotulo="Restam" valor={Math.round(r.kcal)} sufixo="kcal" cor={r.kcal < 0 ? '#ff7a45' : undefined} />
          <Estatistica rotulo="Sódio" valor={Math.round(consumido.sodio ?? 0)} sufixo="mg" />
          <Estatistica rotulo="Açúcar" valor={Math.round(consumido.acucar ?? 0)} sufixo="g" />
        </div>
      </Cartao>

      {/* ------------------------------ Ações ------------------------------- */}
      <div className="grid grid-cols-3 gap-2.5">
        <Botao onClick={() => setFotoAberta(true)} className="flex-col gap-1 py-3">
          <Camera size={18} /> Foto
        </Botao>
        <Botao variante="secundario" onClick={() => setScannerAberto(true)} className="flex-col gap-1 py-3">
          <Barcode size={18} /> Código
        </Botao>
        <Botao
          variante="secundario"
          onClick={() => {
            setAdicionarEm(undefined)
            setBuscaAberta(true)
          }}
          className="flex-col gap-1 py-3"
        >
          <Search size={18} /> Tabela
        </Botao>
      </div>

      {ehHoje && (
        <Aviso tom={rec.tom}>
          <p className="font-semibold">{rec.titulo}</p>
          <p className="mt-1 text-slate-300">{rec.texto}</p>
        </Aviso>
      )}

      {/* ---------------------------- Refeições ----------------------------- */}
      <div>
        <TituloSecao>{refeicoes.length === 1 ? '1 refeição' : `${refeicoes.length} refeições`}</TituloSecao>

        {refeicoes.length === 0 ? (
          <Vazio
            icone={<UtensilsCrossed size={32} />}
            titulo="Nenhuma refeição neste dia"
            texto="Fotografe o prato ou busque na tabela de alimentos."
            acao={
              <Botao onClick={() => setFotoAberta(true)}>
                <Camera size={17} /> Fotografar refeição
              </Botao>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {refeicoes.map((refeicao) => {
              const t = totaisRefeicao(refeicao)
              const aberta = expandida === refeicao.id
              return (
                <Cartao key={refeicao.id} className="p-0 overflow-hidden">
                  <button
                    onClick={() => setExpandida(aberta ? null : refeicao.id)}
                    className="flex w-full items-center gap-3 p-3.5 text-left"
                  >
                    {refeicao.fotoDataUrl ? (
                      <img src={refeicao.fotoDataUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                        🍽️
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{refeicao.titulo}</p>
                      <p className="truncate text-xs text-slate-500">
                        {refeicao.hora} · {ROTULO_REFEICAO[refeicao.tipo]} ·{' '}
                        {refeicao.itens.length === 1 ? '1 item' : `${refeicao.itens.length} itens`}
                      </p>
                      <p className="truncate text-[10px] text-slate-600">{PROCEDENCIA[refeicao.origem]}</p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                        P {Math.round(t.proteina)}g · C {Math.round(t.carbo)}g · G {Math.round(t.gordura)}g
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold tabular-nums">{Math.round(t.kcal)}</p>
                      <p className="text-[10px] text-slate-500">kcal</p>
                    </div>
                  </button>

                  {aberta && (
                    <div className="space-y-2 border-t border-white/[0.07] bg-black/20 p-3.5">
                      {refeicao.itens.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate text-slate-200">{item.nome}</p>
                            <p className="text-[11px] text-slate-500">
                              {Math.round(item.quantidade)} {item.unidade}
                              {item.porcaoDescrita ? ` · ${item.porcaoDescrita}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="tabular-nums text-slate-400">{Math.round(item.kcal)} kcal</span>
                            <button
                              onClick={() => removerItem(refeicao.id, item.id)}
                              className="text-slate-600 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {refeicao.recomendacao && (
                        <div className="pt-1">
                          <Aviso tom="ok">{refeicao.recomendacao}</Aviso>
                        </div>
                      )}
                      {refeicao.observacoes && (
                        <p className="text-[11px] italic text-slate-500">{refeicao.observacoes}</p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Botao
                          variante="fantasma"
                          className="flex-1 py-2 text-sm"
                          onClick={() => {
                            setAdicionarEm(refeicao.id)
                            setBuscaAberta(true)
                          }}
                        >
                          <Plus size={15} /> Adicionar item
                        </Botao>
                        <Botao
                          variante="perigo"
                          className="py-2 text-sm"
                          onClick={() => {
                            removerRefeicao(refeicao.id)
                            setExpandida(null)
                          }}
                        >
                          <Trash2 size={15} /> Excluir
                        </Botao>
                      </div>
                    </div>
                  )}
                </Cartao>
              )
            })}
          </div>
        )}
      </div>

      <AnalisadorFoto aberto={fotoAberta} aoFechar={() => setFotoAberta(false)} data={data} />
      <EscanearProduto aberto={scannerAberto} aoFechar={() => setScannerAberto(false)} data={data} />
      <BuscaAlimento
        aberto={buscaAberta}
        aoFechar={() => setBuscaAberta(false)}
        data={data}
        refeicaoExistenteId={adicionarEm}
      />
    </div>
  )
}

function formatarData(iso: string, completo = false): string {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('pt-BR',
    completo
      ? { weekday: 'long', day: '2-digit', month: 'long' }
      : { day: '2-digit', month: 'short' },
  )
}
