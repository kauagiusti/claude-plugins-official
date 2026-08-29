import type { NutrientesPor100, Produto } from '../types'

// ---------------------------------------------------------------------------
// Open Food Facts.
//
// Base colaborativa e aberta (licença ODbL) de produtos embalados, com boa
// cobertura do que se vende em supermercado no Brasil. É a única fonte pública
// que tem, ao mesmo tempo, código de barras, tabela nutricional, lista de
// ingredientes, aditivos e classificação NOVA.
//
// O QUE ISSO SIGNIFICA PARA A CONFIABILIDADE
//
// Os dados são cadastrados por pessoas, a partir da embalagem. Então:
//
//   - produto pode não existir na base — e aí o app diz isso, não inventa
//   - campo pode faltar — vira null e fica fora da conta, nunca vira zero
//   - valor pode estar errado ou desatualizado — por isso a tela mostra a data
//     do registro, o link da ficha e deixa tudo editável antes de salvar
//
// Nada aqui passa por modelo de linguagem. O que a base informa é o que
// aparece na tela.
// ---------------------------------------------------------------------------

const API = 'https://world.openfoodfacts.org/api/v2/product'
/** A v0 responde a registros antigos que a v2 nem sempre devolve. */
const API_V0 = 'https://world.openfoodfacts.org/api/v0/product'
const FICHA = 'https://world.openfoodfacts.org/product'

const CAMPOS = [
  'code',
  'product_name',
  'product_name_pt',
  'generic_name_pt',
  'generic_name',
  'brands',
  'quantity',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'ingredients_text_pt',
  'ingredients_text',
  'nova_group',
  'additives_tags',
  'image_front_small_url',
  'last_modified_t',
  'categories_tags',
].join(',')

export class ProdutoNaoEncontrado extends Error {
  codigo: string
  constructor(codigo: string) {
    super(`Produto ${codigo} não está na base`)
    this.name = 'ProdutoNaoEncontrado'
    this.codigo = codigo
  }
}

/** Aceita EAN-8, EAN-13 e UPC-A. */
export function codigoValido(codigo: string): boolean {
  return /^\d{8}$|^\d{12,13}$/.test(codigo.trim())
}

/**
 * Confere o dígito verificador do EAN/UPC.
 *
 * Serve para não gastar uma requisição — e um "não encontrado" enganoso —
 * quando a câmera leu um dígito errado. Um EAN que não fecha a soma é leitura
 * ruim, não produto ausente.
 */
export function digitoVerificadorOk(codigo: string): boolean {
  const d = codigo.trim()
  if (!/^\d{8}$|^\d{12,13}$/.test(d)) return false
  const digitos = d.split('').map(Number)
  const verificador = digitos.pop() as number
  // Da direita para a esquerda, alternando peso 3 e 1.
  const soma = digitos.reverse().reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (soma % 10)) % 10 === verificador
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Categorias e unidades que indicam produto líquido — muda os limiares. */
function ehLiquido(bruto: Record<string, unknown>): boolean {
  const categorias = Array.isArray(bruto.categories_tags) ? (bruto.categories_tags as string[]).join(' ') : ''
  if (/beverage|drink|juice|water|soda|milk|refrigerante|suco|bebida|iogurte-liquido/i.test(categorias)) return true
  const quantidade = String(bruto.quantity ?? '')
  return /\b\d+\s*(ml|l|litro)\b/i.test(quantidade)
}

function nutrientes(n: Record<string, unknown>): NutrientesPor100 {
  // kcal direto quando existe; senão converte de kJ (1 kcal = 4,184 kJ).
  let kcal = num(n['energy-kcal_100g'])
  if (kcal == null) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g'])
    if (kj != null) kcal = kj / 4.184
  }

  // A base guarda sódio em GRAMAS. O rótulo brasileiro e o resto do app usam
  // miligramas — converter aqui é o que evita errar o limiar por mil vezes.
  let sodioG = num(n['sodium_100g'])
  if (sodioG == null) {
    const sal = num(n['salt_100g'])
    if (sal != null) sodioG = sal / 2.5 // sal → sódio, fator da própria norma
  }

  return {
    kcal,
    proteina: num(n['proteins_100g']),
    carbo: num(n['carbohydrates_100g']),
    gordura: num(n['fat_100g']),
    gorduraSaturada: num(n['saturated-fat_100g']),
    fibra: num(n['fiber_100g']),
    acucar: num(n['sugars_100g']),
    sodio: sodioG == null ? null : sodioG * 1000,
  }
}

/**
 * Traduz a resposta crua da base para o modelo do app.
 *
 * Separada da requisição de propósito: é a parte que erra em silêncio (unidade
 * trocada, campo com nome diferente, número vindo como texto) e a que os testes
 * em `scripts/testes.mts` cobrem sem depender de rede.
 */
export function normalizarResposta(bruto: Record<string, unknown>, codigo: string): Produto {
  const texto = (...chaves: string[]): string | undefined => {
    for (const c of chaves) {
      const v = bruto[c]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return undefined
  }

  const porcao = num(bruto.serving_quantity)
  const marca = texto('brands')?.split(',')[0]?.trim()
  const modificado = num(bruto.last_modified_t)

  return {
    codigo,
    nome: texto('product_name_pt', 'product_name', 'generic_name_pt', 'generic_name') ?? 'Produto sem nome na base',
    marca,
    embalagem: texto('quantity'),
    porcaoG: porcao && porcao > 0 ? porcao : undefined,
    porcaoDescrita: texto('serving_size'),
    liquido: ehLiquido(bruto),
    por100: nutrientes((bruto.nutriments as Record<string, unknown>) ?? {}),
    ingredientes: texto('ingredients_text_pt', 'ingredients_text'),
    nova: num(bruto.nova_group) ?? undefined,
    aditivos: Array.isArray(bruto.additives_tags) ? (bruto.additives_tags as string[]) : [],
    imagemUrl: texto('image_front_small_url'),
    atualizadoEm: modificado ? new Date(modificado * 1000).toISOString().slice(0, 10) : undefined,
    fonteUrl: `${FICHA}/${codigo}`,
    origem: 'base',
  }
}

/**
 * Produto vazio para o usuário preencher com o que está impresso na embalagem.
 *
 * É a saída para o caso que a base não cobre — e ela não cobre pouca coisa: é
 * colaborativa, e marca regional, produto novo e item de padaria simplesmente
 * não estão lá. Sem isto, "não encontrei" é um beco sem saída; com isto, o
 * usuário digita oito números do rótulo e recebe a mesma avaliação.
 */
export function produtoEmBranco(codigo: string): Produto {
  return {
    codigo,
    nome: '',
    liquido: false,
    por100: {
      kcal: null,
      proteina: null,
      carbo: null,
      gordura: null,
      gorduraSaturada: null,
      fibra: null,
      acucar: null,
      sodio: null,
    },
    aditivos: [],
    fonteUrl: codigo ? `${FICHA}/${codigo}` : FICHA,
    origem: 'rotulo',
  }
}

/**
 * No app nativo a chamada sai pela camada nativa, como as do Claude: sem CORS
 * e sem a WebView no caminho. O import é dinâmico para que o módulo continue
 * carregável fora do navegador — é o que permite testá-lo no Node.
 */
async function transporte(): Promise<typeof fetch> {
  try {
    const nativo = await import('./nativo')
    return nativo.ehNativo() ? nativo.fetchNativo : fetch
  } catch {
    return fetch
  }
}

/** Falha de rede: o pedido não chegou à base, ou a resposta não voltou. */
export class BaseInacessivel extends Error {
  causa?: unknown
  constructor(mensagem: string, causa?: unknown) {
    super(mensagem)
    this.name = 'BaseInacessivel'
    this.causa = causa
  }
}

/**
 * A resposta traz o produto?
 *
 * Deliberadamente frouxo. A API já usou `status: 1` e passou a usar
 * `status: "success"`; um cliente que exige um dos dois quebra quando o outro
 * chega — e quebra do pior jeito possível, dizendo "produto não encontrado"
 * para um produto que a base tem. Quem decide aqui é a existência do produto,
 * não o rótulo do status.
 */
function achou(corpo: { status?: unknown; product?: Record<string, unknown> }): boolean {
  if (!corpo.product || typeof corpo.product !== 'object') return false
  if (Object.keys(corpo.product).length === 0) return false
  const s = corpo.status
  if (s === 0 || s === '0' || s === 'failure' || s === 'not_found') return false
  return true
}

/** O produto voltou, mas sem nenhum nutriente — vale tentar de novo sem filtro. */
function semNutrientes(p: Produto): boolean {
  return Object.values(p.por100).every((v) => v == null)
}

async function pedir(
  requisicao: typeof fetch,
  url: string,
  sinal?: AbortSignal,
): Promise<{ status?: unknown; product?: Record<string, unknown> } | 'ausente'> {
  let resposta: Response
  try {
    resposta = await requisicao(url, { signal: sinal, headers: { Accept: 'application/json' } })
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e
    throw new BaseInacessivel('não foi possível falar com a base de produtos', e)
  }

  if (resposta.status === 404) return 'ausente'
  if (!resposta.ok) throw new BaseInacessivel(`a base respondeu ${resposta.status}`)

  try {
    return (await resposta.json()) as { status?: unknown; product?: Record<string, unknown> }
  } catch (e) {
    throw new BaseInacessivel('a base respondeu num formato inesperado', e)
  }
}

/** Busca o produto pelo código de barras. */
export async function buscarProduto(
  codigo: string,
  opcoes: { sinal?: AbortSignal; requisicao?: typeof fetch } = {},
): Promise<Produto> {
  const limpo = codigo.trim()
  if (!codigoValido(limpo)) throw new Error('Código de barras inválido.')

  const requisicao = opcoes.requisicao ?? (await transporte())

  const primeira = await pedir(requisicao, `${API}/${limpo}.json?fields=${CAMPOS}`, opcoes.sinal)
  if (primeira !== 'ausente' && achou(primeira)) {
    const produto = normalizarResposta(primeira.product!, limpo)
    if (!semNutrientes(produto)) return produto

    // Veio o registro mas sem nutriente nenhum. Antes de dizer que o produto
    // não serve, tenta sem `fields`: se um nome de campo mudar do lado da base,
    // o filtro é justamente o que devolve um produto oco.
    try {
      const completa = await pedir(requisicao, `${API}/${limpo}.json`, opcoes.sinal)
      if (completa !== 'ausente' && achou(completa)) {
        const cheio = normalizarResposta(completa.product!, limpo)
        if (!semNutrientes(cheio)) return cheio
      }
    } catch {
      // A segunda tentativa é melhoria, não requisito: se falhar, devolve o
      // que a primeira trouxe e a tela mostra o que está faltando.
    }
    return produto
  }

  // Sem produto na v2. A base ainda mantém a v0, que responde a códigos
  // antigos que a v2 às vezes não devolve.
  const antiga = await pedir(requisicao, `${API_V0}/${limpo}.json`, opcoes.sinal)
  if (antiga !== 'ausente' && achou(antiga)) return normalizarResposta(antiga.product!, limpo)

  throw new ProdutoNaoEncontrado(limpo)
}

/** Macros de uma quantidade do produto, na estrutura que o diário usa. */
export function macrosDaPorcao(p: Produto, quantidade: number) {
  const f = quantidade / 100
  const ou0 = (v: number | null) => (v == null ? 0 : v * f)
  return {
    kcal: ou0(p.por100.kcal),
    proteina: ou0(p.por100.proteina),
    carbo: ou0(p.por100.carbo),
    gordura: ou0(p.por100.gordura),
    fibra: ou0(p.por100.fibra),
    sodio: ou0(p.por100.sodio),
    acucar: ou0(p.por100.acucar),
  }
}

/** Nutrientes que faltam e por isso entram no diário como zero. */
export function lacunasNoDiario(p: Produto): string[] {
  const nomes: [keyof NutrientesPor100, string][] = [
    ['kcal', 'calorias'],
    ['proteina', 'proteína'],
    ['carbo', 'carboidrato'],
    ['gordura', 'gordura'],
    ['fibra', 'fibra'],
  ]
  return nomes.filter(([chave]) => p.por100[chave] == null).map(([, nome]) => nome)
}
