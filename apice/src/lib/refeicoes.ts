import { ALIMENTOS } from '../data/alimentos'
import type { AlimentoTabela, Macros, Metas } from '../types'
import type { Restante } from './nutricao'

// ---------------------------------------------------------------------------
// Sugestão de refeição e plano do dia.
//
// Antes daqui, a recomendação era uma lista dos três alimentos mais proteicos
// da tabela: sempre os mesmos três, sempre fora de um prato. Quem cozinha não
// come "whey isolado, albumina, proteína de soja" — come arroz com feijão,
// frango e salada.
//
// Este módulo monta PRATOS. Cada momento do dia tem modelos de refeição, cada
// modelo tem papéis (a proteína, o carboidrato, o acompanhamento) e cada papel
// tem uma lista de alimentos que servem. A quantidade é calculada para o que
// falta nas metas e depois arredondada para uma medida caseira — "1½ filé
// médio (180 g)" em vez de "183 g".
//
// Tudo sai da mesma tabela de alimentos do resto do app, com os mesmos valores.
// Nada é inventado aqui: o que este módulo faz é escolher e dimensionar.
// ---------------------------------------------------------------------------

export type Momento = 'cafe' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia'

export const NOME_MOMENTO: Record<Momento, string> = {
  cafe: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

/** Quanto da energia do dia cada refeição costuma levar. Soma 1. */
const PESO_MOMENTO: Record<Momento, number> = {
  cafe: 0.2,
  lanche_manha: 0.08,
  almoco: 0.32,
  lanche_tarde: 0.12,
  jantar: 0.23,
  ceia: 0.05,
}

export function momentoDaHora(hora: number): Momento {
  if (hora < 10) return 'cafe'
  if (hora < 11.5) return 'lanche_manha'
  if (hora < 15) return 'almoco'
  if (hora < 18) return 'lanche_tarde'
  if (hora < 21.5) return 'jantar'
  return 'ceia'
}

/** Os momentos que ainda cabem no dia a partir de uma hora. */
export function momentosRestantes(hora: number): Momento[] {
  const ordem: Momento[] = ['cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia']
  const atual = ordem.indexOf(momentoDaHora(hora))
  return ordem.slice(atual)
}

// --------------------------------- Modelos ---------------------------------

/**
 * Um papel dentro do prato.
 *
 * `escala` diz o que dimensiona a quantidade: `proteina` ajusta para fechar a
 * proteína da refeição, `kcal` preenche a energia que sobrou depois da
 * proteína, e `fixo` fica na porção caseira de sempre — ninguém come três
 * pratos de alface para bater meta.
 */
interface Papel {
  ids: string[]
  escala: 'proteina' | 'kcal' | 'fixo'
  /** Limites em gramas, para a conta não sugerir 600 g de carne. */
  min: number
  max: number
  /** Quantas porções caseiras, quando `fixo`. */
  porcoes?: number
}

interface Modelo {
  nome: string
  papeis: Papel[]
}

const p = (ids: string[], escala: Papel['escala'], min: number, max: number, porcoes = 1): Papel => ({
  ids,
  escala,
  min,
  max,
  porcoes,
})

const PROTEINA_ALMOCO = [
  'frango-peito',
  'frango-coxa',
  'frango-desfiado',
  'patinho-moido',
  'alcatra',
  'contrafile',
  'lombo-suino',
  'tilapia',
  'salmao',
  'camarao',
  'ovo',
  'carne-seca',
]
const CARBO_ALMOCO = ['arroz-branco', 'arroz-integral', 'macarrao', 'macarrao-integral', 'batata', 'batata-doce', 'mandioca', 'quinoa', 'cuscuz', 'polenta', 'inhame']
const LEGUMINOSA = ['feijao-carioca', 'feijao-preto', 'lentilha', 'grao-de-bico']
const VEGETAL = ['brocolis', 'couve', 'alface', 'tomate', 'cenoura', 'abobrinha', 'chuchu', 'beterraba', 'espinafre', 'repolho', 'vagem', 'pepino', 'pimentao']
const FRUTA = ['banana', 'maca', 'laranja', 'mamao', 'manga', 'abacaxi', 'melancia', 'uva', 'morango', 'kiwi', 'melao', 'pera', 'acai']
const OLEAGINOSA = ['castanha-para', 'castanha-caju', 'amendoim', 'amendoas', 'nozes', 'pasta-amendoim', 'chia', 'linhaca']
const PAO = ['pao-frances', 'pao-integral', 'pao-forma', 'tapioca', 'cuscuz', 'pao-de-queijo', 'torrada-integral']

/**
 * O que se acrescenta quando o prato ficou abaixo do alvo de energia.
 *
 * Os tetos por porção impedem a conta de fechar tudo num item só — e é assim
 * mesmo que se come: ninguém resolve 300 kcal faltantes comendo mais meio
 * frango, se resolve pondo um pão a mais, um fio de azeite, uma fruta.
 */
const PROTEINA_EXTRA: Record<Momento, string[]> = {
  cafe: ['ovo', 'clara', 'queijo-minas', 'cottage', 'iogurte-grego-zero', 'peito-peru', 'whey-concentrado'],
  lanche_manha: ['iogurte-grego-zero', 'whey-concentrado', 'cottage', 'ovo'],
  almoco: ['ovo', 'atum-agua', 'frango-desfiado', 'queijo-minas', 'feijao-carioca', 'lentilha'],
  lanche_tarde: ['iogurte-grego-zero', 'whey-isolado', 'cottage', 'peito-peru', 'ovo'],
  jantar: ['ovo', 'atum-agua', 'queijo-minas', 'cottage', 'feijao-preto', 'lentilha'],
  ceia: ['clara', 'cottage', 'iogurte-grego-zero', 'albumina'],
}

const COMPLEMENTOS: Record<Momento, string[]> = {
  cafe: ['pao-frances', 'pao-integral', 'banana', 'mamao', 'suco-laranja', 'pasta-amendoim', 'queijo-minas', 'aveia'],
  lanche_manha: ['banana', 'castanha-caju', 'amendoas', 'granola', 'pao-integral'],
  almoco: ['arroz-branco', 'arroz-integral', 'feijao-carioca', 'farofa', 'azeite', 'mandioca', 'batata'],
  lanche_tarde: ['pao-integral', 'banana', 'pasta-amendoim', 'granola', 'castanha-caju', 'iogurte-natural'],
  jantar: ['arroz-branco', 'batata', 'macarrao', 'azeite', 'pao-integral', 'feijao-carioca'],
  ceia: ['aveia', 'amendoas', 'banana', 'leite-desnatado'],
}

const MODELOS: Record<Momento, Modelo[]> = {
  cafe: [
    {
      nome: 'Pão, proteína e fruta',
      papeis: [p(['ovo', 'clara', 'queijo-minas', 'cottage', 'peito-peru'], 'proteina', 40, 180), p(PAO, 'kcal', 25, 120), p(FRUTA, 'fixo', 60, 200)],
    },
    {
      nome: 'Tigela de aveia',
      papeis: [
        p(['iogurte-grego-zero', 'iogurte-natural', 'leite-desnatado', 'leite-integral', 'whey-concentrado'], 'proteina', 30, 300),
        p(['aveia', 'granola'], 'kcal', 15, 60),
        p(FRUTA, 'fixo', 60, 200),
        p(OLEAGINOSA, 'fixo', 10, 30),
      ],
    },
    {
      nome: 'Tapioca recheada',
      papeis: [p(['ovo', 'frango-desfiado', 'queijo-minas', 'cottage', 'ricota'], 'proteina', 40, 160), p(['tapioca', 'cuscuz'], 'kcal', 30, 110), p(['cafe', 'suco-laranja', 'agua-coco'], 'fixo', 100, 250)],
    },
    {
      nome: 'Café rápido e proteico',
      papeis: [p(['whey-isolado', 'whey-concentrado', 'iogurte-grego-zero', 'albumina'], 'proteina', 25, 200), p(['banana', 'aveia', 'pao-integral'], 'kcal', 25, 90), p(['cafe'], 'fixo', 100, 200)],
    },
  ],

  lanche_manha: [
    { nome: 'Fruta com castanhas', papeis: [p(FRUTA, 'fixo', 70, 200), p(OLEAGINOSA, 'fixo', 10, 30)] },
    { nome: 'Iogurte com granola', papeis: [p(['iogurte-grego-zero', 'iogurte-natural', 'cottage'], 'proteina', 100, 250), p(['granola', 'aveia'], 'kcal', 15, 45), p(FRUTA, 'fixo', 60, 150)] },
    { nome: 'Vitamina', papeis: [p(['whey-concentrado', 'whey-isolado', 'leite-desnatado'], 'proteina', 25, 250), p(['banana', 'mamao', 'morango'], 'fixo', 70, 150), p(['aveia', 'pasta-amendoim'], 'kcal', 10, 40)] },
  ],

  almoco: [
    {
      nome: 'Prato feito',
      papeis: [p(PROTEINA_ALMOCO, 'proteina', 90, 250), p(CARBO_ALMOCO, 'kcal', 60, 250), p(LEGUMINOSA, 'fixo', 80, 140), p(VEGETAL, 'fixo', 60, 120)],
    },
    {
      nome: 'Prato com pouco carboidrato',
      papeis: [p(PROTEINA_ALMOCO, 'proteina', 100, 280), p(VEGETAL, 'fixo', 80, 150), p(['brocolis', 'abobrinha', 'vagem', 'espinafre', 'cenoura'], 'fixo', 70, 140), p(['azeite'], 'fixo', 8, 15)],
    },
    {
      nome: 'Massa com molho',
      papeis: [p(['patinho-moido', 'frango-desfiado', 'atum-agua', 'frango-peito'], 'proteina', 80, 200), p(['macarrao', 'macarrao-integral'], 'kcal', 80, 220), p(['tomate', 'abobrinha', 'espinafre', 'pimentao'], 'fixo', 60, 120)],
    },
    {
      nome: 'Bowl de grãos',
      papeis: [p(['frango-peito', 'tilapia', 'camarao', 'ovo', 'proteina-soja'], 'proteina', 80, 220), p(['quinoa', 'grao-de-bico', 'lentilha', 'batata-doce'], 'kcal', 70, 200), p(VEGETAL, 'fixo', 70, 140), p(['azeite', 'abacate'], 'fixo', 10, 60)],
    },
    {
      nome: 'Peixe com legumes',
      papeis: [p(['tilapia', 'salmao', 'atum-agua', 'sardinha', 'camarao'], 'proteina', 100, 230), p(['batata', 'batata-doce', 'arroz-integral', 'mandioca'], 'kcal', 70, 220), p(['brocolis', 'vagem', 'cenoura', 'abobrinha'], 'fixo', 70, 140)],
    },
  ],

  lanche_tarde: [
    { nome: 'Sanduíche leve', papeis: [p(['peito-peru', 'cottage', 'ricota', 'queijo-minas', 'ovo'], 'proteina', 40, 150), p(['pao-integral', 'pao-forma', 'torrada-integral'], 'kcal', 25, 80), p(['tomate', 'alface', 'pepino'], 'fixo', 30, 80)] },
    { nome: 'Iogurte com fruta', papeis: [p(['iogurte-grego-zero', 'cottage', 'iogurte-natural'], 'proteina', 100, 260), p(FRUTA, 'kcal', 60, 200), p(OLEAGINOSA, 'fixo', 10, 30)] },
    { nome: 'Shake pós-treino', papeis: [p(['whey-isolado', 'whey-concentrado', 'albumina'], 'proteina', 25, 60), p(['banana', 'aveia', 'agua-coco'], 'kcal', 40, 200)] },
    { nome: 'Fruta com pasta de amendoim', papeis: [p(['banana', 'maca', 'pera'], 'fixo', 70, 150), p(['pasta-amendoim', 'amendoim', 'amendoas'], 'kcal', 10, 40)] },
  ],

  jantar: [
    { nome: 'Jantar simples', papeis: [p(PROTEINA_ALMOCO, 'proteina', 90, 240), p(CARBO_ALMOCO, 'kcal', 50, 200), p(VEGETAL, 'fixo', 70, 140)] },
    { nome: 'Omelete com salada', papeis: [p(['ovo', 'clara', 'queijo-minas'], 'proteina', 60, 220), p(['pao-integral', 'batata', 'cuscuz'], 'kcal', 25, 150), p(['alface', 'tomate', 'pepino', 'cenoura'], 'fixo', 60, 130)] },
    { nome: 'Sopa com proteína', papeis: [p(['frango-desfiado', 'patinho-moido', 'lentilha'], 'proteina', 70, 200), p(['batata', 'mandioca', 'inhame', 'quinoa'], 'kcal', 60, 180), p(['cenoura', 'chuchu', 'abobrinha', 'repolho'], 'fixo', 70, 150)] },
    { nome: 'Jantar leve', papeis: [p(['tilapia', 'frango-peito', 'atum-agua', 'ovo'], 'proteina', 90, 220), p(VEGETAL, 'fixo', 80, 150), p(['azeite'], 'fixo', 8, 13)] },
  ],

  ceia: [
    { nome: 'Ceia proteica', papeis: [p(['iogurte-grego-zero', 'cottage', 'clara', 'albumina'], 'proteina', 60, 250)] },
    { nome: 'Leite com aveia', papeis: [p(['leite-desnatado', 'leite-integral'], 'proteina', 150, 300), p(['aveia'], 'kcal', 10, 30)] },
    { nome: 'Chocolate amargo com castanhas', papeis: [p(['chocolate-70'], 'fixo', 15, 25), p(['amendoas', 'castanha-para', 'nozes'], 'fixo', 10, 25)] },
  ],
}

/**
 * Todo id de alimento citado nos modelos e complementos.
 *
 * Existe para o teste: um id com erro de digitação não quebra nada — o alimento
 * simplesmente some do prato, em silêncio, e a refeição fica menor sem que
 * ninguém perceba.
 */
export function idsDosModelos(): string[] {
  const ids = new Set<string>()
  for (const modelos of Object.values(MODELOS)) {
    for (const modelo of modelos) for (const papel of modelo.papeis) for (const id of papel.ids) ids.add(id)
  }
  for (const lista of Object.values(COMPLEMENTOS)) for (const id of lista) ids.add(id)
  for (const lista of Object.values(PROTEINA_EXTRA)) for (const id of lista) ids.add(id)
  return [...ids]
}

// ------------------------------ Sorteio estável -----------------------------

/**
 * Gerador determinístico: a mesma semente devolve a mesma sugestão. É o que
 * faz a tela não trocar o prato a cada renderização e, ao mesmo tempo, permite
 * pedir outro incrementando a semente.
 */
function embaralhador(semente: number) {
  let estado = (semente ^ 0x6d2b79f5) >>> 0
  return () => {
    estado = (estado + 0x9e3779b9) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function sementeDoDia(dataISO: string, rodada = 0): number {
  let h = 2166136261
  for (const c of dataISO) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h ^ Math.imul(rodada + 1, 2654435761)) >>> 0
}

const POR_ID = new Map(ALIMENTOS.map((a) => [a.id, a]))

// ----------------------------- Montagem do prato ----------------------------

export interface ItemSugerido {
  alimento: AlimentoTabela
  gramas: number
  /** Como a pessoa mede na cozinha: "1½ concha (165 g)". */
  medida: string
}

export interface SugestaoRefeicao {
  momento: Momento
  nome: string
  itens: ItemSugerido[]
  macros: Macros
}

const FRACOES = [0.5, 1, 1.5, 2, 2.5, 3, 4]
const NOME_FRACAO: Record<number, string> = { 0.5: '½', 1: '1', 1.5: '1½', 2: '2', 2.5: '2½', 3: '3', 4: '4' }

/**
 * Teto realista por alimento.
 *
 * Sem teto, a conta fecha a meta com quatro fatias de queijo no café. Com teto
 * de porções caseiras, o multiplicador precisa depender do papel: a fonte de
 * proteína para em 3 porções (3 ovos, 3 fatias de queijo), o resto vai a 4 —
 * uma colher de aveia é uma unidade pequena, e ninguém come "2½ colheres" de
 * aveia num café da manhã.
 */
function tetoRealista(a: AlimentoTabela, papel: Papel): number {
  const caseira = a.porcaoCaseira
  if (!caseira || caseira.gramas <= 0) return papel.max
  const multiplicador = papel.escala === 'proteina' ? 3 : 4
  return Math.min(papel.max, caseira.gramas * multiplicador)
}

/**
 * Aproxima a quantidade para algo que se serve.
 *
 * Com porção caseira, arredonda para meia porção — "1½ concha". Sem ela,
 * arredonda para 10 g.
 *
 * O arredondamento respeita o teto: escolher a fração mais próxima sem olhar o
 * limite é o que fazia 220 g de frango virarem 240 g, e com eles 20 g de
 * proteína que a refeição não devia ter.
 */
function medir(a: AlimentoTabela, gramas: number, teto: number): { gramas: number; medida: string } {
  const caseira = a.porcaoCaseira
  if (caseira && caseira.gramas > 0) {
    const bruto = gramas / caseira.gramas
    const cabem = FRACOES.filter((f) => f * caseira.gramas <= teto + 0.5)
    const opcoes = cabem.length > 0 ? cabem : [FRACOES[0]]
    const escolhida = opcoes.reduce((melhor, f) => (Math.abs(f - bruto) < Math.abs(melhor - bruto) ? f : melhor), opcoes[0])
    const g = Math.round(escolhida * caseira.gramas)

    // "1 filé médio" vira "1½ filé médio". Já "1/2 unidade" e "2 quadrados"
    // não aceitam multiplicador na frente — daí sairia "½ 1/2 unidade", que
    // não quer dizer nada. Nesses casos a medida é a própria descrição, e a
    // grama resolve o resto.
    const semUm = caseira.descricao.match(/^1 (.+)$/)
    if (!semUm) {
      // "1/2 unidade" e "2 quadrados" não aceitam multiplicador na frente:
      // "½ 1/2 unidade" não quer dizer nada, e "300 g (1/2 unidade)" mente.
      // Na porção exata a descrição ajuda; fora dela, só a grama é verdade.
      return { gramas: g, medida: escolhida === 1 ? `${caseira.descricao} (${g} g)` : `${g} g` }
    }
    return { gramas: g, medida: `${NOME_FRACAO[escolhida]} ${semUm[1]} (${g} g)` }
  }
  const g = Math.min(teto, Math.max(10, Math.round(gramas / 10) * 10))
  return { gramas: g, medida: `${g} g` }
}

const somar = (itens: ItemSugerido[]): Macros =>
  itens.reduce<Macros>(
    (t, i) => {
      const k = i.gramas / 100
      return {
        kcal: t.kcal + i.alimento.kcal * k,
        proteina: t.proteina + i.alimento.proteina * k,
        carbo: t.carbo + i.alimento.carbo * k,
        gordura: t.gordura + i.alimento.gordura * k,
        fibra: t.fibra + i.alimento.fibra * k,
        sodio: (t.sodio ?? 0) + (i.alimento.sodio ?? 0) * k,
        acucar: (t.acucar ?? 0) + (i.alimento.acucar ?? 0) * k,
      }
    },
    { kcal: 0, proteina: 0, carbo: 0, gordura: 0, fibra: 0, sodio: 0, acucar: 0 },
  )

export interface AlvoRefeicao {
  kcal: number
  proteina: number
}

/**
 * Monta uma refeição para o alvo de energia e proteína.
 *
 * `evitar` recebe nomes já consumidos no dia: sugerir frango no jantar de quem
 * almoçou frango é o tipo de conselho que faz desinstalar o app.
 */
export function sugerirRefeicao(
  momento: Momento,
  alvo: AlvoRefeicao,
  semente: number,
  evitar: Set<string> = new Set(),
): SugestaoRefeicao {
  const aleatorio = embaralhador(semente)
  const modelos = MODELOS[momento]
  const modelo = modelos[Math.floor(aleatorio() * modelos.length)]

  const usados = new Set<string>()
  const itens: (ItemSugerido | null)[] = modelo.papeis.map(() => null)
  let kcalRestante = Math.max(120, alvo.kcal)
  let proteinaRestante = Math.max(8, alvo.proteina)

  // A ordem de CÁLCULO não é a de exibição. Os acompanhamentos de porção fixa
  // entram primeiro e descontam do orçamento; a proteína vem depois; o
  // carboidrato fecha com o que sobrou. Calculando na ordem escrita, os fixos
  // entrariam por último e o prato estouraria o alvo em 200 kcal.
  const ordem = ['fixo', 'proteina', 'kcal'] as const
  const indices = modelo.papeis
    .map((papel, i) => ({ papel, i }))
    .sort((a, b) => ordem.indexOf(a.papel.escala) - ordem.indexOf(b.papel.escala))

  for (const { papel, i } of indices) {
    // Candidatos que existem na tabela, que ainda não entraram no prato e que
    // não foram comidos hoje. Se a exclusão zerar a lista, ela é relaxada —
    // melhor repetir do que não sugerir nada.
    const existentes = papel.ids.map((id) => POR_ID.get(id)).filter((a): a is AlimentoTabela => !!a)
    const livres = existentes.filter((a) => !usados.has(a.id) && !evitar.has(a.nome))
    const pool = livres.length > 0 ? livres : existentes.filter((a) => !usados.has(a.id))
    if (pool.length === 0) continue

    const a = pool[Math.floor(aleatorio() * pool.length)]
    usados.add(a.id)

    let gramas: number
    if (papel.escala === 'proteina' && a.proteina > 0) {
      gramas = (proteinaRestante / a.proteina) * 100
    } else if (papel.escala === 'kcal' && a.kcal > 0) {
      gramas = (kcalRestante / a.kcal) * 100
    } else {
      gramas = (a.porcaoCaseira?.gramas ?? papel.min) * (papel.porcoes ?? 1)
    }
    const teto = Math.max(papel.min, tetoRealista(a, papel))
    gramas = Math.min(teto, Math.max(papel.min, gramas))

    const medido = medir(a, gramas, teto)
    itens[i] = { alimento: a, gramas: medido.gramas, medida: medido.medida }

    const k = medido.gramas / 100
    kcalRestante = Math.max(0, kcalRestante - a.kcal * k)
    proteinaRestante = Math.max(0, proteinaRestante - a.proteina * k)
  }

  const prato = itens.filter((i): i is ItemSugerido => i !== null)

  /**
   * Acrescenta uma porção de acompanhamento e devolve o que ela entregou.
   *
   * Os tetos por porção impedem a conta de fechar tudo num item só — e é assim
   * mesmo que se come: ninguém resolve 300 kcal faltantes comendo mais meio
   * frango, resolve pondo um pão a mais, um ovo, um fio de azeite.
   */
  const acrescentar = (lista: string[], mira: 'kcal' | 'proteina', falta: number): boolean => {
    // Arroz com feijão são dois carboidratos e ninguém reclama; arroz, feijão
    // e mandioca no mesmo prato é a conta falando mais alto que a comida.
    const contagem = new Map<string, number>()
    for (const it of prato) contagem.set(it.alimento.categoria, (contagem.get(it.alimento.categoria) ?? 0) + 1)

    const pool = lista
      .map((id) => POR_ID.get(id))
      .filter((a): a is AlimentoTabela => !!a)
      .filter((a) => !usados.has(a.id) && !evitar.has(a.nome) && (contagem.get(a.categoria) ?? 0) < 2)
    if (pool.length === 0) return false

    const a = pool[Math.floor(aleatorio() * pool.length)]
    usados.add(a.id)

    const porcao = a.porcaoCaseira?.gramas ?? 50
    const por100 = mira === 'kcal' ? a.kcal : a.proteina
    const querido = por100 > 0 ? (falta / por100) * 100 : porcao
    // Duas porções caseiras, e nunca mais de 300 g: sem o segundo limite, um
    // copo de 250 ml vira meio litro de suco.
    const teto = Math.min(porcao * 2, 300)
    const medido = medir(a, Math.min(teto, Math.max(porcao * 0.5, querido)), teto)
    prato.push({ alimento: a, gramas: medido.gramas, medida: medido.medida })

    const k = medido.gramas / 100
    kcalRestante = Math.max(0, kcalRestante - a.kcal * k)
    proteinaRestante = Math.max(0, proteinaRestante - a.proteina * k)
    return true
  }

  // Proteína primeiro: ela também traz energia, então fechar o buraco calórico
  // antes deixaria a refeição cheia e ainda pobre em proteína.
  for (let volta = 0; volta < 2 && proteinaRestante > alvo.proteina * 0.25; volta++) {
    if (!acrescentar(PROTEINA_EXTRA[momento], 'proteina', proteinaRestante)) break
  }

  // Abaixo de 15% de diferença a energia fica como está: precisão maior do que
  // essa é falsa numa estimativa de porção.
  for (let volta = 0; volta < 2 && kcalRestante > alvo.kcal * 0.15; volta++) {
    if (!acrescentar(COMPLEMENTOS[momento], 'kcal', kcalRestante)) break
  }

  return { momento, nome: modelo.nome, itens: prato, macros: somar(prato) }
}

/**
 * Plano para o resto do dia: distribui o que falta entre as refeições que ainda
 * cabem, com os pesos habituais de cada uma.
 *
 * Quando o dia já está estourado, o plano encolhe em vez de sumir — quem passou
 * da meta ainda precisa jantar, e uma sugestão leve é melhor conselho do que
 * silêncio.
 */
export function planoDoDia(
  faltando: Restante,
  hora: number,
  semente: number,
  evitar: Set<string> = new Set(),
): SugestaoRefeicao[] {
  const momentos = momentosRestantes(hora)
  if (momentos.length === 0) return []

  const somaPesos = momentos.reduce((s, m) => s + PESO_MOMENTO[m], 0)
  const kcal = Math.max(momentos.length * 200, faltando.kcal)
  const proteina = Math.max(momentos.length * 12, faltando.proteina)

  const jaNoPlano = new Set(evitar)
  const plano: SugestaoRefeicao[] = []

  for (const [i, m] of momentos.entries()) {
    const fatia = PESO_MOMENTO[m] / somaPesos
    const r = sugerirRefeicao(
      m,
      { kcal: kcal * fatia, proteina: proteina * fatia },
      semente + i * 7919,
      jaNoPlano,
    )
    // Uma refeição não repete o que outra do mesmo plano já usou.
    for (const it of r.itens) jaNoPlano.add(it.alimento.nome)
    plano.push(r)
  }

  return plano
}

/** Totais do plano, para conferir contra as metas. */
export function totaisDoPlano(plano: SugestaoRefeicao[]): Macros {
  return somar(plano.flatMap((r) => r.itens))
}

/** Quanto o plano cobre de cada meta, em porcentagem. */
export function coberturaDoPlano(plano: SugestaoRefeicao[], metas: Metas) {
  const t = totaisDoPlano(plano)
  return {
    kcal: metas.kcal > 0 ? (t.kcal / metas.kcal) * 100 : 0,
    proteina: metas.proteina > 0 ? (t.proteina / metas.proteina) * 100 : 0,
  }
}
