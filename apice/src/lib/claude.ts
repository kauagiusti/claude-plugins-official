import Anthropic from '@anthropic-ai/sdk'
import type { AnaliseFoto, Macros, Metas } from '../types'

// ---------------------------------------------------------------------------
// Integração com a Claude API.
//
// As chamadas saem direto do navegador com a chave do próprio usuário, guardada
// apenas no localStorage do aparelho. É o desenho certo para um app pessoal —
// nenhum servidor intermediário vê os dados — mas significa que a chave fica
// acessível a qualquer script rodando na página: use uma chave dedicada e com
// limite de gasto. Para uso multiusuário, troque `criarCliente` por chamadas a
// um backend próprio que guarde a chave do lado servidor.
// ---------------------------------------------------------------------------

export const MODELO = 'claude-opus-5'

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

function criarCliente(apiKey: string): Anthropic {
  if (!apiKey?.trim()) throw new SemChaveError()
  return new Anthropic({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true,
    defaultHeaders: { 'anthropic-dangerous-direct-browser-access': 'true' },
    maxRetries: 2,
  })
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
): Promise<AnaliseFoto> {
  const client = criarCliente(apiKey)

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

  const resposta = await client.beta.messages.create({
    model: MODELO,
    max_tokens: 10000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
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
  })

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
): Promise<string> {
  const client = criarCliente(apiKey)

  const stream = client.beta.messages.stream({
    model: MODELO,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [
      { type: 'text', text: SISTEMA_COACH },
      { type: 'text', text: `Contexto atual da pessoa:\n${contexto}` },
    ],
    output_config: { effort: 'low' },
    messages: historico.map((m) => ({ role: m.role, content: m.content })),
  })

  if (onDelta) stream.on('text', onDelta)

  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') {
    throw new RecusaError(final.stop_details?.explanation ?? undefined)
  }
  return textoDe(final.content as Array<{ type: string; text?: string }>)
}

/** Testa a chave com a requisição mais barata possível. */
export async function testarChave(apiKey: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const client = criarCliente(apiKey)
    await client.messages.create({
      model: MODELO,
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
