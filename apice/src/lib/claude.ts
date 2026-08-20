import Anthropic from '@anthropic-ai/sdk'
import type { AnaliseFoto, Macros, Metas } from '../types'
import { ehNativo, fetchNativo } from './nativo'

// ---------------------------------------------------------------------------
// Integração com a Claude API.
//
// As chamadas saem direto do aparelho com a chave do próprio usuário — nenhum
// servidor intermediário vê as fotos. No app iOS a chave fica em UserDefaults
// (via Preferences) e a análise sai pela camada nativa; na web fica no
// localStorage e sai pela WebView.
//
// O modelo de confiança é "chave do usuário no aparelho do usuário": bom para
// app pessoal, inadequado para multiusuário. Para esse caso, troque
// `criarCliente` por chamadas a um backend próprio que guarde a chave.
// ---------------------------------------------------------------------------

export type ModeloId = 'claude-opus-5' | 'claude-sonnet-5' | 'claude-haiku-4-5'

export const MODELO_PADRAO: ModeloId = 'claude-opus-5'

export const MODELOS: {
  id: ModeloId
  nome: string
  descricao: string
  /** Custo aproximado por análise de foto, em dólares. */
  custoPorAnalise: number
}[] = [
  {
    id: 'claude-opus-5',
    nome: 'Opus 5',
    descricao: 'Melhor leitura de porção e de prato misturado. Recomendado.',
    custoPorAnalise: 0.06,
  },
  {
    id: 'claude-sonnet-5',
    nome: 'Sonnet 5',
    descricao: 'Quase tão bom, por metade do preço. Boa escolha para uso diário.',
    custoPorAnalise: 0.037,
  },
  {
    id: 'claude-haiku-4-5',
    nome: 'Haiku 4.5',
    descricao: 'O mais barato e rápido. Acerta o prato simples; erra porção e molho.',
    custoPorAnalise: 0.012,
  },
]

/*
 * Como as estimativas acima foram calculadas, para dar para refazer a conta
 * quando o preço mudar:
 *
 *   entrada ≈ 2.200 tokens  (foto de 1024 px ≈ 1.500 + prompt ≈ 550 + contexto)
 *   saída   ≈ 2.000 tokens  (JSON estruturado ≈ 700 + raciocínio ≈ 1.300)
 *
 *   Opus 5     US$ 5/MTok entrada + US$ 25/MTok saída → ~US$ 0,061
 *   Sonnet 5   US$ 3/MTok + US$ 15/MTok               → ~US$ 0,037
 *   Haiku 4.5  US$ 1/MTok + US$  5/MTok               → ~US$ 0,012
 *
 * São ordens de grandeza: prato com muitos itens gasta mais, prato simples
 * gasta menos. O valor de verdade está no painel da Anthropic.
 */

export class SemChaveError extends Error {
  constructor() {
    super('Configure sua chave da Claude API em Ajustes para usar a análise por foto.')
    this.name = 'SemChaveError'
  }
}

export class RecusaError extends Error {
  constructor(motivo?: string) {
    super(motivo || 'O modelo recusou esta solicitação.')
    this.name = 'RecusaError'
  }
}

/**
 * @param viaNativo quando true, as requisições saem pela camada nativa do app
 *   em vez da WebView. Sem WebView não há CORS — a chamada é HTTP comum feita
 *   pelo processo do app. Em troca perde-se streaming, então só vale para
 *   respostas que chegam de uma vez.
 */
function criarCliente(apiKey: string, viaNativo = false): Anthropic {
  if (!apiKey?.trim()) throw new SemChaveError()
  return new Anthropic({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true,
    defaultHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' },
    maxRetries: 2,
    ...(viaNativo && ehNativo() ? { fetch: fetchNativo } : {}),
  })
}

/**
 * `fallbacks: 'default'` faz uma recusa de classificador ser reatendida por
 * outro modelo — vale a pena ter. Mas é um recurso beta: se a conta não tiver
 * acesso, a API devolve 400 e o recurso principal do app morre junto.
 *
 * Esta função tenta com o fallback e, se a rejeição for por causa dele,
 * repete sem. Perde-se a rede de proteção, não a análise.
 */
async function comFallbackOpcional<T>(
  executar: (extras: Record<string, unknown>) => Promise<T>,
  podeRepetir: () => boolean = () => true,
): Promise<T> {
  try {
    return await executar({
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    })
  } catch (e) {
    const err = e as { status?: number; message?: string }
    const rejeitouOBeta =
      err?.status === 400 && /fallback|beta|unsupported|unrecognized/i.test(err?.message ?? '')
    if (!rejeitouOBeta || !podeRepetir()) throw e
    return executar({})
  }
}

/** Extrai o texto concatenado dos blocos de texto da resposta. */
function textoDe(blocos: Array<{ type: string; text?: string }>): string {
  return blocos
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
}

// ------------------------- Esquema da análise de foto ----------------------

const ESQUEMA_ITEM = {
  type: 'object',
  properties: {
    nome: { type: 'string', description: 'Nome do alimento em português do Brasil.' },
    quantidade: { type: 'number', description: 'Quantidade estimada, na unidade indicada.' },
    unidade: { type: 'string', enum: ['g', 'ml', 'un'] },
    porcaoDescrita: {
      type: 'string',
      description: 'Porção em medida caseira, ex.: "1 concha média", "2 fatias".',
    },
    kcal: { type: 'number' },
    proteina: { type: 'number', description: 'Gramas de proteína.' },
    carbo: { type: 'number', description: 'Gramas de carboidrato.' },
    gordura: { type: 'number', description: 'Gramas de gordura.' },
    fibra: { type: 'number', description: 'Gramas de fibra.' },
    sodio: { type: 'number', description: 'Miligramas de sódio.' },
    acucar: { type: 'number', description: 'Gramas de açúcar.' },
    confianca: { type: 'number', description: 'Confiança de 0 a 1 nesta estimativa.' },
  },
  required: [
    'nome',
    'quantidade',
    'unidade',
    'porcaoDescrita',
    'kcal',
    'proteina',
    'carbo',
    'gordura',
    'fibra',
    'sodio',
    'acucar',
    'confianca',
  ],
  additionalProperties: false,
} as const

const ESQUEMA_ANALISE = {
  type: 'object',
  properties: {
    titulo: { type: 'string', description: 'Nome curto da refeição, ex.: "Almoço — frango com arroz e salada".' },
    itens: { type: 'array', items: ESQUEMA_ITEM },
    confiancaGeral: { type: 'number', description: 'Confiança geral de 0 a 1.' },
    recomendacao: {
      type: 'string',
      description: 'Uma orientação curta e acionável para o resto do dia, em português do Brasil.',
    },
    alertas: { type: 'array', items: { type: 'string' } },
    observacoes: { type: 'string', description: 'O que ficou ambíguo na foto e que o usuário deve ajustar.' },
  },
  required: ['titulo', 'itens', 'confiancaGeral', 'recomendacao', 'alertas', 'observacoes'],
  additionalProperties: false,
} as const

const SISTEMA_NUTRICAO = `Você estima a composição nutricional de refeições a partir de fotos, no contexto alimentar brasileiro.

Para cada alimento visível na foto:
- Identifique o alimento e o método de preparo aparente (grelhado, frito, refogado, cru). O preparo muda muito a gordura — óleo de fritura e molho visível contam.
- Estime a quantidade em gramas usando as referências de escala presentes: diâmetro de prato raso (~26 cm), talheres, latas, copos, mãos.
- Informe também a porção em medida caseira, que é como a pessoa vai conferir e corrigir.
- Preencha kcal e macros para a QUANTIDADE ESTIMADA, não por 100 g.
- Use "confianca" com honestidade: alimentos parcialmente ocultos, molhos e frituras merecem confiança baixa.

Não invente alimentos que não dá para ver. Se algo estiver ambíguo (o que tem dentro do sanduíche, se o arroz tem óleo), estime o caso mais comum e registre a dúvida em "observacoes".

Em "recomendacao", escreva 1 ou 2 frases sobre o que fazer no restante do dia, considerando o que já foi consumido e as metas informadas. Seja concreto — cite alimentos e quantidades, não princípios genéricos. Fale direto com a pessoa, em português do Brasil.

Em "alertas", inclua apenas o que for factual e relevante nesta refeição (sódio alto, refeição muito densa, ausência de proteína). Deixe a lista vazia se não houver nada digno de nota.

Você estima; não diagnostica. Nada de recomendação clínica ou de suplementação terapêutica.`

export interface ContextoDia {
  consumido: Macros
  metas: Metas
  hora: string
  descricaoUsuario?: string
}

export async function analisarFoto(
  apiKey: string,
  imagens: { base64: string; mediaType: string }[],
  ctx: ContextoDia,
  modelo: ModeloId = MODELO_PADRAO,
): Promise<AnaliseFoto> {
  // Resposta única, sem streaming: pode sair pela camada nativa e escapar de CORS.
  const client = criarCliente(apiKey, true)

  const restante = {
    kcal: Math.round(ctx.metas.kcal - ctx.consumido.kcal),
    proteina: Math.round(ctx.metas.proteina - ctx.consumido.proteina),
    carbo: Math.round(ctx.metas.carbo - ctx.consumido.carbo),
    gordura: Math.round(ctx.metas.gordura - ctx.consumido.gordura),
  }

  const contexto = [
    `Horário: ${ctx.hora}.`,
    `Metas do dia: ${ctx.metas.kcal} kcal, ${ctx.metas.proteina} g proteína, ${ctx.metas.carbo} g carbo, ${ctx.metas.gordura} g gordura.`,
    `Já consumido hoje ANTES desta refeição: ${Math.round(ctx.consumido.kcal)} kcal, ${Math.round(ctx.consumido.proteina)} g proteína, ${Math.round(ctx.consumido.carbo)} g carbo, ${Math.round(ctx.consumido.gordura)} g gordura.`,
    `Restante antes desta refeição: ${restante.kcal} kcal, ${restante.proteina} g proteína, ${restante.carbo} g carbo, ${restante.gordura} g gordura.`,
    ctx.descricaoUsuario ? `Descrição dada pela pessoa: "${ctx.descricaoUsuario}"` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const resposta = await comFallbackOpcional((extras) =>
    client.beta.messages.create({
      ...extras,
      model: modelo,
      max_tokens: 10000,
      system: SISTEMA_NUTRICAO,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: ESQUEMA_ANALISE as unknown as Record<string, unknown> },
      },
      messages: [
        {
          role: 'user',
          content: [
            ...imagens.map((img) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: img.mediaType as 'image/jpeg',
                data: img.base64,
              },
            })),
            { type: 'text' as const, text: `Analise esta refeição.\n\n${contexto}` },
          ],
        },
      ],
    }),
  )

  if (resposta.stop_reason === 'refusal') {
    throw new RecusaError(resposta.stop_details?.explanation ?? undefined)
  }

  const texto = textoDe(resposta.content as Array<{ type: string; text?: string }>)
  if (!texto) throw new Error('A análise voltou vazia. Tente novamente com uma foto mais nítida.')

  let dados: AnaliseFoto
  try {
    dados = JSON.parse(texto) as AnaliseFoto
  } catch {
    throw new Error('Não consegui interpretar a resposta da análise. Tente novamente.')
  }

  // O schema garante os campos, mas o app não deve quebrar se algo vier torto.
  return {
    titulo: dados.titulo || 'Refeição',
    itens: Array.isArray(dados.itens) ? dados.itens : [],
    confiancaGeral: Number.isFinite(dados.confiancaGeral) ? dados.confiancaGeral : 0.5,
    recomendacao: dados.recomendacao || '',
    alertas: Array.isArray(dados.alertas) ? dados.alertas : [],
    observacoes: dados.observacoes || '',
  }
}

// --------------------------------- Coach -----------------------------------

const SISTEMA_COACH = `Você é o treinador do app Ápice: nutrição e treino de força, em português do Brasil.

A pessoa está no meio da rotina dela, olhando o celular. Responda como um treinador experiente responderia entre uma série e outra: direto ao ponto, com números concretos quando eles existirem no contexto, sem encher linguiça.

Trabalhe com os dados do dia que vêm no contexto — metas, consumo, treinos, níveis de força. Se a resposta depender de algo que não está ali, diga o que falta em vez de supor.

Mantenha as respostas curtas: normalmente 2 a 4 frases. Só vá mais longe quando a pessoa pedir um plano ou uma explicação de fato. Nada de listas longas para perguntas simples, nada de repetir de volta o que ela acabou de dizer.

Você orienta treino e alimentação de pessoas saudáveis. Dor persistente, lesão, sintoma clínico ou uso de medicamento: diga com uma frase que aquilo é caso para profissional de saúde e siga com o que estiver no seu escopo.`

export interface MensagemChat {
  role: 'user' | 'assistant'
  content: string
}

export async function perguntarCoach(
  apiKey: string,
  historico: MensagemChat[],
  contexto: string,
  onDelta?: (t: string) => void,
  modelo: ModeloId = MODELO_PADRAO,
): Promise<string> {
  const parametros = {
    model: modelo,
    max_tokens: 4000,
    system: [
      { type: 'text' as const, text: SISTEMA_COACH },
      { type: 'text' as const, text: `Contexto atual da pessoa:\n${contexto}` },
    ],
    output_config: { effort: 'low' as const },
    messages: historico.map((m) => ({ role: m.role, content: m.content })),
  }

  // Streaming pela WebView é o caminho bom: o texto aparece aos poucos. Se a
  // WebView barrar a chamada (CORS, rede do app), refaz de uma vez só pela
  // camada nativa — o coach perde o efeito de digitação, não a resposta.
  // Se o texto já começou a chegar, uma nova tentativa duplicaria o conteúdo
  // no acumulador de quem chamou. A degradação só é segura antes do primeiro
  // delta — na prática o 400 do beta acontece bem antes disso.
  let jaEmitiu = false
  const emitir = onDelta
    ? (t: string) => {
        jaEmitiu = true
        onDelta(t)
      }
    : undefined

  try {
    const final = await comFallbackOpcional(async (extras) => {
      const stream = criarCliente(apiKey).beta.messages.stream({ ...extras, ...parametros })
      if (emitir) stream.on('text', emitir)
      return stream.finalMessage()
    }, () => !jaEmitiu)
    if (final.stop_reason === 'refusal') {
      throw new RecusaError(final.stop_details?.explanation ?? undefined)
    }
    return textoDe(final.content as Array<{ type: string; text?: string }>)
  } catch (e) {
    if (e instanceof RecusaError || !ehNativo() || !ehErroDeTransporte(e)) throw e

    const resposta = await comFallbackOpcional((extras) =>
      criarCliente(apiKey, true).beta.messages.create({ ...extras, ...parametros }),
    )
    if (resposta.stop_reason === 'refusal') {
      throw new RecusaError(resposta.stop_details?.explanation ?? undefined)
    }
    const texto = textoDe(resposta.content as Array<{ type: string; text?: string }>)
    onDelta?.(texto)
    return texto
  }
}

/** Falha de rede/CORS — vale reenviar pela camada nativa. Erro da API, não. */
function ehErroDeTransporte(e: unknown): boolean {
  const err = e as { status?: number; message?: string }
  if (typeof err?.status === 'number') return false
  return /fetch|network|cors|failed|load/i.test(err?.message ?? '')
}

/** Testa a chave com a requisição mais barata possível. */
export async function testarChave(
  apiKey: string,
  modelo: ModeloId = MODELO_PADRAO,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const client = criarCliente(apiKey, true)
    await client.messages.create({
      model: modelo,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'ok' }],
    })
    return { ok: true }
  } catch (e) {
    const err = e as { status?: number; message?: string }
    if (err.status === 401) return { ok: false, erro: 'Chave inválida ou revogada.' }
    if (err.status === 403) return { ok: false, erro: 'Chave sem permissão para este modelo.' }
    if (err.status === 429) return { ok: false, erro: 'Limite de uso atingido. Tente em instantes.' }
    return { ok: false, erro: err.message ?? 'Falha ao conectar na API.' }
  }
}

export function mensagemDeErro(e: unknown): string {
  if (e instanceof SemChaveError || e instanceof RecusaError) return e.message
  const err = e as { status?: number; message?: string }
  if (err?.status === 401) return 'Chave da API inválida. Confira em Ajustes.'
  if (err?.status === 429) return 'Limite de requisições atingido. Aguarde alguns segundos.'
  if (err?.status && err.status >= 500) return 'A API está instável no momento. Tente novamente.'
  return err?.message || 'Algo deu errado. Tente novamente.'
}
