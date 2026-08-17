import { Camera, Images, ImagePlus, Sparkles, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { analisarFoto, mensagemDeErro } from '../lib/claude'
import { prepararImagem, miniatura } from '../lib/imagem'
import { ehNativo, escolherDaGaleria, tirarFoto, vibrar } from '../lib/nativo'
import { alertasRefeicao, ROTULO_REFEICAO, somarMacros, tipoRefeicaoPorHora } from '../lib/nutricao'
import { horaAgora, metasDe, totaisDoDia, useStore } from '../lib/store'
import type { AnaliseFoto, ItemAlimento, TipoRefeicao } from '../types'
import { Aviso, Botao, Campo, Carregando, Cartao, Chip, Painel, Selecao } from './ui'

type Fase = 'escolher' | 'analisando' | 'revisar'

export function AnalisadorFoto({
  aberto,
  aoFechar,
  data,
}: {
  aberto: boolean
  aoFechar: () => void
  data: string
}) {
  const [fase, setFase] = useState<Fase>('escolher')
  const [imagens, setImagens] = useState<{ dataUrl: string; base64: string; mediaType: string }[]>([])
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<TipoRefeicao>(tipoRefeicaoPorHora())
  const [erro, setErro] = useState<string | null>(null)
  const [analise, setAnalise] = useState<AnaliseFoto | null>(null)
  const [itens, setItens] = useState<ItemAlimento[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const apiKey = useStore((s) => s.apiKey)
  const modelo = useStore((s) => s.modelo)
  const addRefeicao = useStore((s) => s.addRefeicao)
  const contarAnalise = useStore((s) => s.contarAnalise)
  const estado = useStore()

  function limpar() {
    setFase('escolher')
    setImagens([])
    setDescricao('')
    setErro(null)
    setAnalise(null)
    setItens([])
  }

  function fechar() {
    limpar()
    aoFechar()
  }

  /** No app instalado a câmera nativa já entrega a imagem redimensionada. */
  async function capturar(origem: 'camera' | 'galeria') {
    setErro(null)
    if (!ehNativo()) {
      inputRef.current?.click()
      return
    }
    try {
      const novas = origem === 'camera' ? [await tirarFoto()] : await escolherDaGaleria()
      setImagens((atuais) => [...atuais, ...novas].slice(0, 3))
      await vibrar('leve')
    } catch (e) {
      // Usuário cancelando a câmera não é erro que mereça alerta.
      const msg = (e as Error)?.message ?? ''
      if (!/cancel/i.test(msg)) setErro(mensagemDeErro(e))
    }
  }

  async function receberArquivos(lista: FileList | null) {
    if (!lista?.length) return
    setErro(null)
    try {
      const preparadas = await Promise.all(Array.from(lista).slice(0, 3).map((f) => prepararImagem(f)))
      setImagens((atuais) => [...atuais, ...preparadas].slice(0, 3))
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function analisar() {
    if (imagens.length === 0) return
    setFase('analisando')
    setErro(null)
    try {
      const resultado = await analisarFoto(
        apiKey,
        imagens.map((i) => ({ base64: i.base64, mediaType: i.mediaType })),
        {
          consumido: totaisDoDia(estado, data),
          metas: metasDe(estado),
          hora: horaAgora(),
          descricaoUsuario: descricao || undefined,
        },
        modelo,
      )
      contarAnalise()
      await vibrar('sucesso')
      setAnalise(resultado)
      setItens(resultado.itens.map((i, idx) => ({ ...i, id: `tmp-${idx}` })))
      setFase('revisar')
    } catch (e) {
      setErro(mensagemDeErro(e))
      await vibrar('erro')
      setFase('escolher')
    }
  }

  async function salvar() {
    if (!analise) return
    const foto = imagens[0] ? await miniatura(imagens[0].dataUrl) : undefined
    addRefeicao({
      data,
      hora: horaAgora(),
      tipo,
      titulo: analise.titulo,
      itens,
      fotoDataUrl: foto,
      origem: 'foto',
      observacoes: analise.observacoes,
      recomendacao: analise.recomendacao,
    })
    fechar()
  }

  function ajustarQuantidade(itemId: string, novaQuantidade: number) {
    setItens((atuais) =>
      atuais.map((i) => {
        if (i.id !== itemId) return i
        // Escala os macros junto com a quantidade — é o ajuste que a pessoa
        // mais faz depois de olhar a estimativa ("era meia concha, não uma").
        const k = i.quantidade > 0 ? novaQuantidade / i.quantidade : 0
        return {
          ...i,
          quantidade: novaQuantidade,
          kcal: Math.round(i.kcal * k),
          proteina: +(i.proteina * k).toFixed(1),
          carbo: +(i.carbo * k).toFixed(1),
          gordura: +(i.gordura * k).toFixed(1),
          fibra: +(i.fibra * k).toFixed(1),
          sodio: i.sodio ? Math.round(i.sodio * k) : undefined,
          acucar: i.acucar ? +(i.acucar * k).toFixed(1) : undefined,
        }
      }),
    )
  }

  const totais = somarMacros(itens)
  const alertas = [...(analise?.alertas ?? []), ...alertasRefeicao(totais)]

  return (
    <Painel aberto={aberto} aoFechar={fechar} titulo="Analisar refeição">
      {/* ---------------------------- 1. Escolher --------------------------- */}
      {fase === 'escolher' && (
        <div className="space-y-4">
          {!apiKey && (
            <Aviso tom="atencao">
              A leitura automática precisa da chave da Claude API — configure em <strong>Ajustes › Conectar Claude</strong>. Enquanto
              isso, dá para registrar pela tabela de alimentos.
            </Aviso>
          )}

          {imagens.length === 0 ? (
            <div className="space-y-2">
              <button
                onClick={() => capturar('camera')}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed
                           border-white/15 py-10 text-slate-400 transition hover:border-lime/40 hover:text-lime"
              >
                <Camera size={34} />
                <span className="text-sm font-medium">Tirar foto</span>
                <span className="max-w-[16rem] text-center text-xs text-slate-500">
                  Enquadre o prato inteiro. Um talher ou a borda do prato ajudam a acertar a porção.
                </span>
              </button>
              <Botao variante="fantasma" className="w-full" onClick={() => capturar('galeria')}>
                <Images size={17} /> Escolher da galeria
              </Botao>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {imagens.map((img, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={img.dataUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                    <button
                      onClick={() => setImagens((a) => a.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {imagens.length < 3 && (
                  <button
                    onClick={() => capturar('camera')}
                    className="flex aspect-square items-center justify-center rounded-xl border-2
                               border-dashed border-white/15 text-slate-500 hover:border-lime/40 hover:text-lime"
                  >
                    <ImagePlus size={20} />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Mais de um ângulo melhora a estimativa de volume — principalmente em prato fundo.
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              receberArquivos(e.target.files)
              e.target.value = ''
            }}
          />

          <Selecao rotulo="Refeição" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRefeicao)}>
            {Object.entries(ROTULO_REFEICAO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Selecao>

          <Campo
            rotulo="Detalhes (opcional)"
            placeholder="ex.: arroz integral, frango sem óleo, 2 colheres de feijão"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            dica="Tudo que a foto não mostra: preparo, molho escondido, marca do produto."
          />

          {erro && <Aviso tom="alerta">{erro}</Aviso>}

          <Botao onClick={analisar} disabled={imagens.length === 0 || !apiKey} className="w-full py-3.5">
            <Sparkles size={18} /> Analisar refeição
          </Botao>
        </div>
      )}

      {/* --------------------------- 2. Analisando -------------------------- */}
      {fase === 'analisando' && (
        <div className="py-6">
          {imagens[0] && (
            <img
              src={imagens[0].dataUrl}
              alt=""
              className="mx-auto mb-6 h-40 w-40 rounded-2xl object-cover opacity-60"
            />
          )}
          <Carregando texto="Identificando alimentos e estimando porções…" />
          <p className="mt-2 text-center text-xs text-slate-500">Leva alguns segundos.</p>
        </div>
      )}

      {/* ---------------------------- 3. Revisar ---------------------------- */}
      {fase === 'revisar' && analise && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{analise.titulo}</h3>
            <p className="text-xs text-slate-500">
              Confiança da leitura: {Math.round(analise.confiancaGeral * 100)}% — confira as quantidades antes de
              salvar.
            </p>
          </div>

          <Cartao className="grid grid-cols-4 gap-2 text-center">
            {[
              ['kcal', Math.round(totais.kcal), '#ffffff'],
              ['Proteína', `${Math.round(totais.proteina)}g`, '#4ec3f2'],
              ['Carbo', `${Math.round(totais.carbo)}g`, '#c6f24e'],
              ['Gordura', `${Math.round(totais.gordura)}g`, '#ff7a45'],
            ].map(([rot, val, cor]) => (
              <div key={rot as string}>
                <p className="text-[11px] text-slate-500">{rot as string}</p>
                <p className="font-bold tabular-nums" style={{ color: cor as string }}>
                  {val as string | number}
                </p>
              </div>
            ))}
          </Cartao>

          <div className="space-y-2">
            {itens.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.nome}</p>
                    {item.porcaoDescrita && <p className="text-xs text-slate-500">{item.porcaoDescrita}</p>}
                  </div>
                  <button
                    onClick={() => setItens((a) => a.filter((i) => i.id !== item.id))}
                    className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={Math.round(item.quantidade)}
                    onChange={(e) => ajustarQuantidade(item.id, Number(e.target.value))}
                    className="w-20 rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-sm tabular-nums
                               outline-none focus:border-lime/50"
                  />
                  <span className="text-sm text-slate-500">{item.unidade}</span>
                  <div className="flex-1 text-right text-xs tabular-nums text-slate-400">
                    {Math.round(item.kcal)} kcal · P {item.proteina.toFixed(1)} · C {item.carbo.toFixed(1)} · G{' '}
                    {item.gordura.toFixed(1)}
                  </div>
                </div>

                {item.confianca != null && item.confianca < 0.6 && (
                  <p className="mt-2 text-[11px] text-amber-300/80">
                    Estimativa incerta ({Math.round(item.confianca * 100)}%) — vale conferir.
                  </p>
                )}
              </div>
            ))}
          </div>

          {analise.observacoes && (
            <Aviso tom="info">
              <strong>O que ficou em dúvida: </strong>
              {analise.observacoes}
            </Aviso>
          )}

          {alertas.length > 0 && (
            <Aviso tom="atencao">
              <ul className="list-inside list-disc space-y-1">
                {alertas.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </Aviso>
          )}

          {analise.recomendacao && (
            <Aviso tom="ok">
              <strong>Recomendação: </strong>
              {analise.recomendacao}
            </Aviso>
          )}

          <div className="flex flex-wrap gap-2">
            {Object.entries(ROTULO_REFEICAO).map(([k, v]) => (
              <Chip key={k} ativo={tipo === k} onClick={() => setTipo(k as TipoRefeicao)}>
                {v}
              </Chip>
            ))}
          </div>

          <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-white/[0.07] bg-ink-900 px-5 py-3">
            <Botao variante="fantasma" onClick={() => setFase('escolher')}>
              Refazer
            </Botao>
            <Botao onClick={salvar} className="flex-1" disabled={itens.length === 0}>
              Salvar refeição
            </Botao>
          </div>
        </div>
      )}
    </Painel>
  )
}
