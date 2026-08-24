import {
  AlertTriangle,
  Barcode,
  Check,
  ExternalLink,
  Keyboard,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buscarProduto,
  codigoValido,
  digitoVerificadorOk,
  lacunasNoDiario,
  macrosDaPorcao,
  ProdutoNaoEncontrado,
} from '../lib/produtos'
import { avaliarProduto, descreverNova, formatarAditivo } from '../lib/rotulo'
import { ROTULO_REFEICAO } from '../lib/nutricao'
import { horaAgora, useStore } from '../lib/store'
import { vibrar } from '../lib/nativo'
import type { Produto, TipoRefeicao } from '../types'
import { Aviso, Botao, Campo, Cartao, Chip, Painel, Selecao, cx } from './ui'

type Etapa = 'camera' | 'manual' | 'buscando' | 'produto'

/**
 * Leitura de código de barras e avaliação do produto.
 *
 * A câmera é conveniência; o código digitado é a garantia. Toda leitura passa
 * pelo dígito verificador antes de virar requisição — assim "não encontrei"
 * quer dizer que o produto não está na base, e não que a câmera leu errado.
 */
export function EscanearProduto({
  aberto,
  aoFechar,
  data,
}: {
  aberto: boolean
  aoFechar: () => void
  data: string
}) {
  const [etapa, setEtapa] = useState<Etapa>('camera')
  const [codigo, setCodigo] = useState('')
  const [digitado, setDigitado] = useState('')
  const [produto, setProduto] = useState<Produto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [quantidade, setQuantidade] = useState(100)
  const [tipo, setTipo] = useState<TipoRefeicao>('lanche_tarde')

  const addRefeicao = useStore((s) => s.addRefeicao)

  const videoRef = useRef<HTMLVideoElement>(null)
  const leitorRef = useRef<{ reset: () => void } | null>(null)

  const pararCamera = useCallback(() => {
    leitorRef.current?.reset()
    leitorRef.current = null
  }, [])

  function fechar() {
    pararCamera()
    setEtapa('camera')
    setCodigo('')
    setDigitado('')
    setProduto(null)
    setErro(null)
    setQuantidade(100)
    aoFechar()
  }

  const procurar = useCallback(
    async (valor: string) => {
      pararCamera()
      setCodigo(valor)
      setErro(null)
      setEtapa('buscando')
      try {
        const p = await buscarProduto(valor)
        setProduto(p)
        setQuantidade(p.porcaoG && p.porcaoG > 0 ? p.porcaoG : 100)
        setEtapa('produto')
        void vibrar('sucesso')
      } catch (e) {
        setProduto(null)
        setErro(
          e instanceof ProdutoNaoEncontrado
            ? `O código ${valor} não está no Open Food Facts. A base é colaborativa e não cobre tudo — dá para cadastrar o produto lá, ou registrar pela tabela de alimentos.`
            : e instanceof Error
              ? `Não consegui consultar a base: ${e.message}`
              : 'Não consegui consultar a base de produtos.',
        )
        setEtapa('manual')
        void vibrar('erro')
      }
    },
    [pararCamera],
  )

  // ------------------------------- Câmera ---------------------------------
  useEffect(() => {
    if (!aberto || etapa !== 'camera') return
    let cancelado = false

    ;(async () => {
      try {
        const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = await import('@zxing/library')
        if (cancelado) return

        // Só os formatos de produto embalado: menos formatos, menos leitura
        // errada e decodificação bem mais rápida no celular.
        const dicas = new Map()
        dicas.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ])
        const leitor = new BrowserMultiFormatReader(dicas)
        leitorRef.current = leitor

        await leitor.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current!,
          (resultado) => {
            if (cancelado || !resultado) return
            const lido = resultado.getText().trim()
            // Leitura que não fecha o dígito verificador é descartada em
            // silêncio: a câmera continua tentando e o usuário nem percebe.
            if (!codigoValido(lido) || !digitoVerificadorOk(lido)) return
            void vibrar('medio')
            void procurar(lido)
          },
        )
      } catch (e) {
        if (cancelado) return
        const nome = (e as { name?: string })?.name
        setErro(
          nome === 'NotAllowedError'
            ? 'Permissão de câmera negada. Libere nos ajustes do navegador ou digite o código abaixo.'
            : nome === 'NotFoundError'
              ? 'Nenhuma câmera disponível neste aparelho. Digite o código abaixo.'
              : 'Não consegui abrir a câmera aqui. Digite o código impresso na embalagem.',
        )
        setEtapa('manual')
      }
    })()

    return () => {
      cancelado = true
      pararCamera()
    }
  }, [aberto, etapa, procurar, pararCamera])

  useEffect(() => {
    if (!aberto) pararCamera()
  }, [aberto, pararCamera])

  // ------------------------------ Salvar ----------------------------------
  function salvar() {
    if (!produto || quantidade <= 0) return
    const m = macrosDaPorcao(produto, quantidade)
    addRefeicao({
      data,
      hora: horaAgora(),
      tipo,
      titulo: produto.marca ? `${produto.nome} — ${produto.marca}` : produto.nome,
      origem: 'codigo-barras',
      codigoBarras: produto.codigo,
      itens: [
        {
          nome: produto.nome,
          quantidade,
          unidade: produto.liquido ? 'ml' : 'g',
          porcaoDescrita: produto.porcaoDescrita,
          ...m,
        },
      ],
    })
    void vibrar('sucesso')
    fechar()
  }

  const podeDigitar = digitado.trim().length > 0
  const digitadoOk = codigoValido(digitado) && digitoVerificadorOk(digitado)

  return (
    <Painel aberto={aberto} aoFechar={fechar} titulo="Escanear produto">
      <div className="space-y-3">
        {etapa === 'camera' && (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-[78%] rounded-xl border-2 border-lime/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
            </div>
            <p className="text-center text-xs text-slate-500">
              Aponte para o código de barras da embalagem. A leitura é conferida pelo dígito verificador antes de
              consultar a base.
            </p>
            <Botao variante="secundario" className="w-full" onClick={() => setEtapa('manual')}>
              <Keyboard size={17} /> Digitar o código
            </Botao>
          </>
        )}

        {etapa === 'manual' && (
          <>
            {import.meta.env.VITE_PREVIEW_SANDBOX && (
              <Aviso tom="info">
                <strong className="font-semibold">Versão de demonstração.</strong> O sandbox bloqueia câmera e
                chamadas para fora do domínio, então a leitura e a consulta à base de produtos não funcionam
                aqui. Num host próprio ou no iPhone, funcionam — e sem precisar de chave de API.
              </Aviso>
            )}
            {erro && <Aviso tom="atencao">{erro}</Aviso>}
            <Campo
              rotulo="Código de barras"
              type="text"
              inputMode="numeric"
              placeholder="7891000000000"
              value={digitado}
              autoFocus
              onChange={(e) => setDigitado(e.target.value.replace(/\D/g, ''))}
            />
            {podeDigitar && !digitadoOk && (
              <p className="text-xs text-amber-200">
                Esse número não fecha o dígito verificador — confira se falta ou sobra algum algarismo.
              </p>
            )}
            <div className="flex gap-2">
              <Botao className="flex-1" disabled={!digitadoOk} onClick={() => void procurar(digitado)}>
                <Barcode size={17} /> Buscar
              </Botao>
              <Botao
                variante="secundario"
                onClick={() => {
                  setErro(null)
                  setEtapa('camera')
                }}
              >
                <RefreshCw size={17} />
              </Botao>
            </div>
          </>
        )}

        {etapa === 'buscando' && (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <Loader2 size={28} className="animate-spin text-lime" />
            <p className="text-sm">Consultando o código {codigo}…</p>
          </div>
        )}

        {etapa === 'produto' && produto && (
          <FichaProduto
            produto={produto}
            quantidade={quantidade}
            setQuantidade={setQuantidade}
            tipo={tipo}
            setTipo={setTipo}
            aoSalvar={salvar}
            aoEscanearOutro={() => {
              setProduto(null)
              setDigitado('')
              setEtapa('camera')
            }}
          />
        )}
      </div>
    </Painel>
  )
}

// ---------------------------------------------------------------------------

function FichaProduto({
  produto,
  quantidade,
  setQuantidade,
  tipo,
  setTipo,
  aoSalvar,
  aoEscanearOutro,
}: {
  produto: Produto
  quantidade: number
  setQuantidade: (v: number) => void
  tipo: TipoRefeicao
  setTipo: (t: TipoRefeicao) => void
  aoSalvar: () => void
  aoEscanearOutro: () => void
}) {
  const a = avaliarProduto(produto)
  const m = macrosDaPorcao(produto, quantidade)
  const lacunas = lacunasNoDiario(produto)
  const nova = descreverNova(produto.nova)
  const unidade = produto.liquido ? 'ml' : 'g'

  return (
    <div className="space-y-3">
      {/* ----------------------------- Cabeçalho ---------------------------- */}
      <Cartao className="flex items-center gap-3">
        {produto.imagemUrl ? (
          <img src={produto.imagemUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white/5 object-contain" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/5">
            <Barcode size={24} className="text-slate-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{produto.nome}</p>
          {produto.marca && <p className="text-xs text-slate-400">{produto.marca}</p>}
          <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
            {produto.codigo}
            {produto.embalagem ? ` · ${produto.embalagem}` : ''}
          </p>
        </div>
      </Cartao>

      {/* --------------------------- Marcadores ----------------------------- */}
      {a.altos.length > 0 && (
        <div className="space-y-2">
          {a.altos.map((marcador) => (
            <div
              key={marcador.nutriente}
              className={cx(
                'rounded-xl border px-3.5 py-3',
                marcador.certeza === 'confirmado'
                  ? 'border-flame/40 bg-flame/[0.09]'
                  : 'border-amber-400/30 bg-amber-400/[0.07]',
              )}
            >
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
                <AlertTriangle size={15} />
                Alto em {marcador.nutriente.toLowerCase()}
                {marcador.certeza === 'provavel' && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-slate-300">
                    provável
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs tabular-nums text-slate-300">
                {marcador.valor.toFixed(marcador.unidade === 'mg' ? 0 : 1)} {marcador.unidade} por {a.unidadeBase} —
                o limite da ANVISA é {marcador.limite} {marcador.unidade}.
              </p>
              {marcador.nota && <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{marcador.nota}</p>}
            </div>
          ))}
        </div>
      )}

      {a.positivos.length > 0 && (
        <div className="rounded-xl border border-lime/25 bg-lime/[0.06] px-3.5 py-3">
          {a.positivos.map((t) => (
            <p key={t} className="flex items-center gap-2 text-sm text-lime-soft">
              <ShieldCheck size={15} /> {t}
            </p>
          ))}
        </div>
      )}

      {a.altos.length === 0 && a.positivos.length === 0 && a.semDados.length === 0 && (
        <Aviso tom="ok">Nenhum nutriente acima dos limites da rotulagem frontal brasileira.</Aviso>
      )}

      {/* ------------------------ Tabela nutricional ------------------------ */}
      <Cartao className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tabela nutricional</p>
          <p className="text-[11px] text-slate-500">por {a.unidadeBase}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <Linha rotulo="Calorias" valor={produto.por100.kcal} unidade="kcal" />
          <Linha rotulo="Proteína" valor={produto.por100.proteina} unidade="g" />
          <Linha rotulo="Carboidrato" valor={produto.por100.carbo} unidade="g" />
          <Linha rotulo="Açúcares" valor={produto.por100.acucar} unidade="g" />
          <Linha rotulo="Gordura" valor={produto.por100.gordura} unidade="g" />
          <Linha rotulo="Saturada" valor={produto.por100.gorduraSaturada} unidade="g" />
          <Linha rotulo="Fibra" valor={produto.por100.fibra} unidade="g" />
          <Linha rotulo="Sódio" valor={produto.por100.sodio} unidade="mg" casas={0} />
        </dl>
        {a.semDados.length > 0 && (
          <p className="border-t border-white/[0.07] pt-2 text-[11px] leading-relaxed text-slate-500">
            Sem dado na base para {a.semDados.join(', ')}. Esses nutrientes ficam fora da avaliação — ausência de
            informação não é ausência do nutriente.
          </p>
        )}
      </Cartao>

      {/* ----------------------- Ingredientes e NOVA ------------------------ */}
      {(produto.ingredientes || nova || produto.aditivos.length > 0) && (
        <Cartao className="space-y-2.5">
          {nova && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">NOVA</span>
              <span
                className={cx(
                  'rounded-full border px-2.5 py-0.5 text-xs',
                  produto.nova === 4
                    ? 'border-flame/40 bg-flame/10 text-orange-200'
                    : 'border-white/10 bg-white/5 text-slate-300',
                )}
              >
                {produto.nova} · {nova}
              </span>
            </div>
          )}
          {produto.ingredientes && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Ingredientes</p>
              <p className="text-[13px] leading-relaxed text-slate-300">{produto.ingredientes}</p>
            </div>
          )}
          {produto.aditivos.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Aditivos ({produto.aditivos.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {produto.aditivos.map((t) => (
                  <span key={t} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] tabular-nums text-slate-300">
                    {formatarAditivo(t)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {a.observacoes.map((o) => (
            <p key={o} className="text-[11px] leading-relaxed text-slate-500">
              {o}
            </p>
          ))}
        </Cartao>
      )}

      {/* ----------------------------- Registrar ---------------------------- */}
      <Cartao className="space-y-3">
        <Campo
          rotulo={`Quantidade consumida (${unidade})`}
          type="number"
          inputMode="decimal"
          sufixo={unidade}
          value={quantidade || ''}
          onChange={(e) => setQuantidade(Number(e.target.value))}
        />
        <div className="flex flex-wrap gap-2">
          {produto.porcaoG && (
            <Chip ativo={quantidade === produto.porcaoG} onClick={() => setQuantidade(produto.porcaoG!)}>
              Porção do rótulo ({produto.porcaoG} {unidade})
            </Chip>
          )}
          {[30, 50, 100, 200].map((g) => (
            <Chip key={g} ativo={quantidade === g} onClick={() => setQuantidade(g)}>
              {g} {unidade}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-xl bg-black/25 p-2.5 text-center">
          {[
            ['kcal', Math.round(m.kcal), '#ffffff'],
            ['P', `${m.proteina.toFixed(1)}g`, '#4ec3f2'],
            ['C', `${m.carbo.toFixed(1)}g`, '#c6f24e'],
            ['G', `${m.gordura.toFixed(1)}g`, '#ff7a45'],
          ].map(([r, v, cor]) => (
            <div key={r as string}>
              <p className="text-[10px] uppercase text-slate-500">{r as string}</p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: cor as string }}>
                {v as string}
              </p>
            </div>
          ))}
        </div>

        {lacunas.length > 0 && (
          <Aviso tom="atencao">
            A base não informa {lacunas.join(', ')} deste produto. Vai entrar no seu dia como zero, o que puxa o
            total para baixo. Confira a embalagem antes de confiar no fechamento do dia.
          </Aviso>
        )}

        <Selecao rotulo="Refeição" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRefeicao)}>
          {Object.entries(ROTULO_REFEICAO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Selecao>

        <div className="flex gap-2">
          <Botao className="flex-1" onClick={aoSalvar} disabled={quantidade <= 0}>
            <Plus size={17} /> Adicionar ao dia
          </Botao>
          <Botao variante="secundario" onClick={aoEscanearOutro}>
            <Barcode size={17} />
          </Botao>
        </div>
      </Cartao>

      {/* ----------------------------- Procedência -------------------------- */}
      <p className="px-1 text-[11px] leading-relaxed text-slate-500">
        <Check size={11} className="mr-1 inline" />
        Dados do <strong className="text-slate-400">Open Food Facts</strong>, base aberta alimentada por
        colaboradores a partir da embalagem
        {produto.atualizadoEm ? `, atualizada em ${formatarBR(produto.atualizadoEm)}` : ''}. Nenhum número desta
        tela foi estimado pelo app.{' '}
        <a
          href={produto.fonteUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-sky2 underline underline-offset-2"
        >
          Conferir ou corrigir a ficha <ExternalLink size={10} className="inline" />
        </a>
      </p>
    </div>
  )
}

function Linha({
  rotulo,
  valor,
  unidade,
  casas = 1,
}: {
  rotulo: string
  valor: number | null
  unidade: string
  casas?: number
}) {
  return (
    <>
      <dt className="text-slate-400">{rotulo}</dt>
      <dd className="text-right tabular-nums text-slate-200">
        {valor == null ? (
          <span className="text-slate-600">não informado</span>
        ) : (
          `${valor.toFixed(casas)} ${unidade}`
        )}
      </dd>
    </>
  )
}

function formatarBR(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}
