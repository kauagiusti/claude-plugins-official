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

/** Busca o produto pelo código de barras. */
export async function buscarProduto(
  codigo: string,
  opcoes: { sinal?: AbortSignal; requisicao?: typeof fetch } = {},
): Promise<Produto> {
  const limpo = codigo.trim()
  if (!codigoValido(limpo)) throw new Error('Código de barras inválido.')

  const requisicao = opcoes.requisicao ?? (await transporte())
  const resposta = await requisicao(`${API}/${limpo}.json?fields=${CAMPOS}`, {
    signal: opcoes.sinal,
    headers: { Accept: 'application/json' },
  })

  if (resposta.status === 404) throw new ProdutoNaoEncontrado(limpo)
  if (!resposta.ok) throw new Error(`A base de produtos respondeu ${resposta.status}.`)

  const corpo = (await resposta.json()) as { status?: number; product?: Record<string, unknown> }
  if (corpo.status !== 1 || !corpo.product) throw new ProdutoNaoEncontrado(limpo)

  return normalizarResposta(corpo.product, limpo)
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
