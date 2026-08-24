import type { AvaliacaoProduto, MarcadorAlto, Produto } from '../types'

// ---------------------------------------------------------------------------
// Avaliação de produto embalado.
//
// Tudo aqui é determinístico e roda no aparelho: mesma entrada, mesma saída,
// sem modelo de linguagem no caminho. O motivo é simples — os limiares que
// definem "alto em açúcar" no Brasil são norma publicada, com número exato.
// Pedir esse julgamento a um modelo seria trocar uma regra verificável por um
// palpite bem escrito.
//
// FONTES DOS NÚMEROS
//
// Rotulagem frontal — ANVISA, RDC 429/2020 e IN 75/2020, valores em vigor
// depois do período de transição:
//
//                        sólidos (100 g)   líquidos (100 ml)
//   açúcares adicionados      15 g              7,5 g
//   gorduras saturadas         6 g              3 g
//   sódio                    600 mg           300 mg
//
// Alegações nutricionais complementares — ANVISA, RDC 54/2012, critério por
// 100 g / 100 ml. A tela cita o corte usado em vez de afirmar a alegação legal,
// porque a norma tem condições que dependem de dados que nem sempre existem:
//
//   fonte de fibras   3 g/100 g      alto em fibras   6 g/100 g
//   fonte de proteína 6 g/100 g      alto em proteína 12 g/100 g
//
// A de proteína traz ainda a condição de a proteína responder por pelo menos
// 12% do valor energético — sem ela, biscoito recheado passaria por fonte de
// proteína.
//
// Classificação NOVA — Guia Alimentar para a População Brasileira. Vem pronta
// do Open Food Facts; o app não recalcula.
// ---------------------------------------------------------------------------

interface Limiares {
  acucar: number
  saturada: number
  sodio: number
}

const ALTO_EM: Record<'solido' | 'liquido', Limiares> = {
  solido: { acucar: 15, saturada: 6, sodio: 600 },
  liquido: { acucar: 7.5, saturada: 3, sodio: 300 },
}

const FONTE_FIBRA = { solido: 3, liquido: 1.5 }
const ALTO_FIBRA = { solido: 6, liquido: 3 }
const FONTE_PROTEINA = { solido: 6, liquido: 3 }
const ALTO_PROTEINA = { solido: 12, liquido: 6 }

/**
 * Fração mínima da energia que precisa vir da proteína para o produto poder ser
 * chamado de fonte de proteína — condição da própria RDC 54/2012, e a que
 * separa um alimento proteico de um doce que por acaso tem proteína.
 */
const PROPORCAO_ENERGIA_PROTEINA = 0.12

/**
 * Ingredientes que caracterizam açúcar adicionado.
 *
 * Existe porque a norma brasileira mede açúcar ADICIONADO e a base de dados
 * informa açúcar TOTAL. Leite e fruta têm açúcar intrínseco e não deveriam
 * disparar o alerta. Sem encontrar um destes na lista de ingredientes, o app
 * relata o valor e diz que não deu para separar — não acusa.
 */
const ACUCARES_ADICIONADOS = [
  'acucar',
  'acucar invertido',
  'acucar mascavo',
  'acucar demerara',
  'xarope',
  'glicose',
  'dextrose',
  'frutose',
  'maltodextrina',
  'maltose',
  'melado',
  'melaco',
  'mel',
  'caldo de cana',
  'sacarose',
  'lactose adicionada',
  'concentrado de suco',
  'suco concentrado',
]

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/**
 * Termos casados por palavra inteira. Busca por trecho acusaria "melancia" e
 * "caramelo" de conterem "mel", que é justamente o tipo de erro que faz o
 * usuário deixar de confiar no resto.
 */
const PADROES_ACUCAR = ACUCARES_ADICIONADOS.map(
  (termo) => new RegExp(`(^|[^a-z0-9])${termo.replace(/ /g, '\\s+')}([^a-z0-9]|$)`),
)

/** Detecta açúcar adicionado na lista de ingredientes. */
export function temAcucarAdicionado(ingredientes: string | undefined): boolean {
  if (!ingredientes) return false
  const texto = semAcento(ingredientes)
  return PADROES_ACUCAR.some((re) => re.test(texto))
}

const NOME_NOVA: Record<number, string> = {
  1: 'In natura ou minimamente processado',
  2: 'Ingrediente culinário processado',
  3: 'Processado',
  4: 'Ultraprocessado',
}

export function descreverNova(grupo: number | undefined): string | null {
  return grupo ? (NOME_NOVA[grupo] ?? null) : null
}

/** "en:e621" → "E621". O código INS é o que o rótulo brasileiro imprime. */
export function formatarAditivo(tag: string): string {
  const bruto = tag.replace(/^[a-z]{2}:/, '').toUpperCase()
  return bruto.replace(/^E(\d)/, 'E$1')
}

function marcador(
  nutriente: MarcadorAlto['nutriente'],
  valor: number,
  limite: number,
  unidade: string,
  certeza: MarcadorAlto['certeza'],
  nota?: string,
): MarcadorAlto {
  return { nutriente, valor, limite, unidade, certeza, nota }
}

/**
 * Avalia um produto contra os limiares acima.
 *
 * Regra que vale para a função inteira: **nutriente ausente não vira zero.**
 * O que a base não informa entra em `semDados` e fica fora do julgamento — um
 * produto sem sódio declarado não é um produto sem sódio.
 */
export function avaliarProduto(p: Produto): AvaliacaoProduto {
  const forma = p.liquido ? 'liquido' : 'solido'
  const limites = ALTO_EM[forma]
  const unidadeBase = p.liquido ? '100 ml' : '100 g'

  const altos: MarcadorAlto[] = []
  const positivos: string[] = []
  const semDados: string[] = []
  const observacoes: string[] = []

  // ----------------------------- Açúcar -----------------------------------
  if (p.por100.acucar == null) {
    semDados.push('açúcares')
  } else if (p.por100.acucar >= limites.acucar) {
    const adicionado = temAcucarAdicionado(p.ingredientes)
    altos.push(
      marcador(
        'Açúcar',
        p.por100.acucar,
        limites.acucar,
        'g',
        adicionado ? 'confirmado' : 'provavel',
        adicionado
          ? 'A lista de ingredientes traz açúcar adicionado.'
          : 'A base informa açúcares totais e a norma mede os adicionados. Não achei açúcar adicionado nos ingredientes — pode ser açúcar da própria fruta ou do leite.',
      ),
    )
  }

  // -------------------------- Gordura saturada ----------------------------
  if (p.por100.gorduraSaturada == null) {
    semDados.push('gorduras saturadas')
  } else if (p.por100.gorduraSaturada >= limites.saturada) {
    altos.push(marcador('Gordura saturada', p.por100.gorduraSaturada, limites.saturada, 'g', 'confirmado'))
  }

  // ------------------------------- Sódio ----------------------------------
  if (p.por100.sodio == null) {
    semDados.push('sódio')
  } else if (p.por100.sodio >= limites.sodio) {
    altos.push(marcador('Sódio', p.por100.sodio, limites.sodio, 'mg', 'confirmado'))
  }

  // ------------------------------ Positivos -------------------------------
  if (p.por100.fibra != null) {
    if (p.por100.fibra >= ALTO_FIBRA[forma]) positivos.push(`Alto teor de fibras — ${p.por100.fibra.toFixed(1)} g por ${unidadeBase}`)
    else if (p.por100.fibra >= FONTE_FIBRA[forma]) positivos.push(`Fonte de fibras — ${p.por100.fibra.toFixed(1)} g por ${unidadeBase}`)
  } else {
    semDados.push('fibras')
  }

  if (p.por100.proteina != null) {
    // A norma de proteína tem uma segunda exigência que a de fibra não tem: a
    // proteína precisa responder por ao menos 12% da energia do produto. Sem
    // ela, um biscoito com 6 g de proteína e 480 kcal viraria "fonte de
    // proteína" — verdade aritmética e mentira prática.
    const energiaDaProteina = p.por100.kcal && p.por100.kcal > 0 ? (p.por100.proteina * 4) / p.por100.kcal : null
    const proporcaoOk = energiaDaProteina == null || energiaDaProteina >= PROPORCAO_ENERGIA_PROTEINA
    const semEnergia = energiaDaProteina == null ? ' (energia não informada, então só o teor foi checado)' : ''

    if (proporcaoOk) {
      if (p.por100.proteina >= ALTO_PROTEINA[forma]) {
        positivos.push(`Alto teor de proteína — ${p.por100.proteina.toFixed(1)} g por ${unidadeBase}${semEnergia}`)
      } else if (p.por100.proteina >= FONTE_PROTEINA[forma]) {
        positivos.push(`Fonte de proteína — ${p.por100.proteina.toFixed(1)} g por ${unidadeBase}${semEnergia}`)
      }
    } else if (p.por100.proteina >= FONTE_PROTEINA[forma]) {
      observacoes.push(
        `Tem ${p.por100.proteina.toFixed(1)} g de proteína por ${unidadeBase}, mas ela representa só ${(energiaDaProteina! * 100).toFixed(0)}% das calorias — abaixo dos 12% que a norma exige para chamar de fonte de proteína. O resto da energia vem de carboidrato e gordura.`,
      )
    }
  } else {
    semDados.push('proteínas')
  }

  // ------------------------------ Contexto --------------------------------
  if (p.nova === 4) {
    observacoes.push(
      'Classificado como ultraprocessado pela NOVA, a mesma classificação do Guia Alimentar. Isso descreve o grau de processamento, não a composição — os limiares acima é que olham os nutrientes.',
    )
  }
  if (p.aditivos.length > 0) {
    observacoes.push(
      `${p.aditivos.length} aditivo${p.aditivos.length > 1 ? 's' : ''} declarado${p.aditivos.length > 1 ? 's' : ''}. Aditivo aprovado é permitido dentro dos limites da ANVISA; a quantidade deles serve como marcador de processamento, não como acusação.`,
    )
  }

  return { altos, positivos, semDados, observacoes, unidadeBase }
}
