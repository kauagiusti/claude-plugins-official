/**
 * Testes das partes que decidem números.
 *
 * Rode com `npm test`. Não cobre a interface — cobre o que erra em silêncio:
 * unidade trocada, limiar fora do lugar, ausência virando zero, dígito
 * verificador aceito por engano.
 *
 * Roda no Node com `--experimental-strip-types`, então os módulos testados não
 * podem importar nada de navegador no topo do arquivo.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { alturaReferencia, fatorAltura, fatorIdade } from '../src/data/padroesForca.ts'
import { estimar1RM } from '../src/lib/forca.ts'
import {
  codigoValido,
  digitoVerificadorOk,
  lacunasNoDiario,
  macrosDaPorcao,
  normalizarResposta,
} from '../src/lib/produtos.ts'
import { avaliarProduto, temAcucarAdicionado } from '../src/lib/rotulo.ts'
import { EXERCICIOS } from '../src/data/exercicios.ts'
import { POSES, poseDoExercicio } from '../src/lib/figuras.ts'

// ---------------------------------------------------------------------------
// Código de barras
// ---------------------------------------------------------------------------

test('aceita EAN-8, EAN-13 e UPC-A; recusa o resto', () => {
  assert.equal(codigoValido('7891000315507'), true)
  assert.equal(codigoValido('96385074'), true)
  assert.equal(codigoValido('036000291452'), true)
  assert.equal(codigoValido('12345'), false)
  assert.equal(codigoValido('789100031550a'), false)
})

test('dígito verificador aprova códigos reais', () => {
  // EAN-13 publicados, com o dígito que a própria embalagem imprime.
  assert.equal(digitoVerificadorOk('5449000000996'), true) // Coca-Cola 330 ml
  assert.equal(digitoVerificadorOk('4006381333931'), true) // exemplo canônico do GS1
  assert.equal(digitoVerificadorOk('96385074'), true) // EAN-8 canônico
  assert.equal(digitoVerificadorOk('036000291452'), true) // UPC-A canônico
})

test('dígito verificador reprova leitura trocada', () => {
  assert.equal(digitoVerificadorOk('5449000000997'), false) // último dígito errado
  assert.equal(digitoVerificadorOk('5449000000969'), false) // dois dígitos trocados
})

// ---------------------------------------------------------------------------
// Leitura da base de produtos
// ---------------------------------------------------------------------------

/** Resposta no formato do Open Food Facts, com as armadilhas que ela tem. */
const BRUTO_BISCOITO = {
  code: '7891000100103',
  product_name: 'Biscoito recheado chocolate',
  brands: 'Marca Exemplo, Outra',
  quantity: '140 g',
  serving_size: '30 g (3 unidades)',
  serving_quantity: '30',
  ingredients_text_pt:
    'Farinha de trigo enriquecida, açúcar, gordura vegetal, cacau em pó, xarope de glicose, sal, fermentos químicos.',
  nova_group: 4,
  additives_tags: ['en:e322', 'en:e500'],
  last_modified_t: 1700000000,
  categories_tags: ['en:snacks', 'en:biscuits'],
  nutriments: {
    'energy-kcal_100g': 480,
    proteins_100g: 6,
    carbohydrates_100g: 68,
    sugars_100g: 34,
    fat_100g: 20,
    'saturated-fat_100g': 9.5,
    fiber_100g: 2.1,
    sodium_100g: 0.32, // GRAMAS na base — 320 mg no rótulo
  },
}

test('sódio vem em gramas da base e sai em miligramas', () => {
  const p = normalizarResposta(BRUTO_BISCOITO, '7891000100103')
  assert.equal(p.por100.sodio, 320)
})

test('sal é convertido em sódio quando o sódio falta', () => {
  const p = normalizarResposta(
    { ...BRUTO_BISCOITO, nutriments: { salt_100g: 1.5 } },
    '7891000100103',
  )
  assert.ok(p.por100.sodio !== null)
  assert.equal(Math.round(p.por100.sodio), 600) // 1,5 g de sal ÷ 2,5
})

test('energia em kJ vira kcal quando não há kcal', () => {
  const p = normalizarResposta({ ...BRUTO_BISCOITO, nutriments: { energy_100g: 2000 } }, '1')
  assert.ok(p.por100.kcal !== null)
  assert.equal(Math.round(p.por100.kcal), 478)
})

test('nutriente ausente fica null, nunca zero', () => {
  const p = normalizarResposta({ ...BRUTO_BISCOITO, nutriments: {} }, '1')
  assert.equal(p.por100.proteina, null)
  assert.equal(p.por100.sodio, null)
  assert.equal(p.por100.fibra, null)
  assert.deepEqual(lacunasNoDiario(p).sort(), ['calorias', 'carboidrato', 'fibra', 'gordura', 'proteína'].sort())
})

test('número em texto é aceito; lixo é descartado', () => {
  const p = normalizarResposta(
    { ...BRUTO_BISCOITO, nutriments: { proteins_100g: '7.5', fat_100g: 'n/a', sugars_100g: -3 } },
    '1',
  )
  assert.equal(p.por100.proteina, 7.5)
  assert.equal(p.por100.gordura, null)
  assert.equal(p.por100.acucar, null) // negativo é dado corrompido
})

test('detecta produto líquido pela categoria e pela embalagem', () => {
  assert.equal(normalizarResposta(BRUTO_BISCOITO, '1').liquido, false)
  assert.equal(
    normalizarResposta({ ...BRUTO_BISCOITO, categories_tags: ['en:beverages'] }, '1').liquido,
    true,
  )
  assert.equal(
    normalizarResposta({ ...BRUTO_BISCOITO, categories_tags: [], quantity: '1,5 L' }, '1').liquido,
    true,
  )
  assert.equal(
    normalizarResposta({ ...BRUTO_BISCOITO, categories_tags: [], quantity: '350 ml' }, '1').liquido,
    true,
  )
})

test('campos de texto caem para a alternativa disponível', () => {
  const p = normalizarResposta(BRUTO_BISCOITO, '7891000100103')
  assert.equal(p.marca, 'Marca Exemplo') // só a primeira
  assert.equal(p.porcaoG, 30)
  assert.equal(p.atualizadoEm, '2023-11-14')
  assert.ok(p.fonteUrl.endsWith('/7891000100103'))
})

test('macros escalam pela quantidade e ausência não inventa valor', () => {
  const p = normalizarResposta(BRUTO_BISCOITO, '1')
  const m = macrosDaPorcao(p, 30)
  assert.equal(Math.round(m.kcal), 144)
  assert.equal(Math.round(m.sodio), 96)
  const vazio = normalizarResposta({ ...BRUTO_BISCOITO, nutriments: {} }, '1')
  assert.equal(macrosDaPorcao(vazio, 30).kcal, 0)
})

// ---------------------------------------------------------------------------
// Avaliação contra os limiares da ANVISA
// ---------------------------------------------------------------------------

test('biscoito recheado dispara os três marcadores certos', () => {
  const a = avaliarProduto(normalizarResposta(BRUTO_BISCOITO, '1'))
  const nomes = a.altos.map((m) => m.nutriente).sort()
  // açúcar 34 ≥ 15 · saturada 9,5 ≥ 6 · sódio 320 < 600
  assert.deepEqual(nomes, ['Açúcar', 'Gordura saturada'])
  assert.equal(a.altos.find((m) => m.nutriente === 'Açúcar')?.certeza, 'confirmado')
})

test('limiar de líquido é mais baixo que o de sólido', () => {
  const nutriments = { sugars_100g: 10, 'saturated-fat_100g': 4, sodium_100g: 0.4 }
  const solido = avaliarProduto(normalizarResposta({ ...BRUTO_BISCOITO, nutriments }, '1'))
  const liquido = avaliarProduto(
    normalizarResposta({ ...BRUTO_BISCOITO, nutriments, categories_tags: ['en:beverages'] }, '1'),
  )
  assert.equal(solido.altos.length, 0) // 10 < 15, 4 < 6, 400 < 600
  assert.equal(liquido.altos.length, 3) // 10 ≥ 7,5, 4 ≥ 3, 400 ≥ 300
})

test('açúcar de fruta não é acusado de açúcar adicionado', () => {
  const suco = {
    ...BRUTO_BISCOITO,
    categories_tags: ['en:beverages'],
    ingredients_text_pt: 'Suco de uva integral.',
    nutriments: { sugars_100g: 16 },
  }
  const a = avaliarProduto(normalizarResposta(suco, '1'))
  const acucar = a.altos.find((m) => m.nutriente === 'Açúcar')
  assert.equal(acucar?.certeza, 'provavel')
  assert.match(acucar?.nota ?? '', /totais/)
})

test('nutriente sem dado fica fora do julgamento e é listado', () => {
  const a = avaliarProduto(normalizarResposta({ ...BRUTO_BISCOITO, nutriments: {} }, '1'))
  assert.equal(a.altos.length, 0)
  assert.ok(a.semDados.includes('sódio'))
  assert.ok(a.semDados.includes('açúcares'))
})

test('positivos usam os cortes declarados', () => {
  const a = avaliarProduto(
    normalizarResposta(
      // 25 g de proteína em 200 kcal → 50% da energia, passa nas duas condições
      { ...BRUTO_BISCOITO, nutriments: { proteins_100g: 25, fiber_100g: 7, 'energy-kcal_100g': 200 } },
      '1',
    ),
  )
  assert.ok(a.positivos.some((t) => t.startsWith('Alto teor de proteína')))
  assert.ok(a.positivos.some((t) => t.startsWith('Alto teor de fibras')))
})

test('doce com proteína não vira "fonte de proteína"', () => {
  // O biscoito tem 6 g/100 g, que passa no corte, mas 480 kcal — a proteína é
  // 5% da energia, contra os 12% que a norma exige.
  const a = avaliarProduto(normalizarResposta(BRUTO_BISCOITO, '1'))
  assert.equal(
    a.positivos.some((t) => /proteína/.test(t)),
    false,
  )
  assert.ok(a.observacoes.some((o) => /12%/.test(o)), 'e explica por que não conta')
})

test('sem energia declarada, só o teor é checado — e a tela diz isso', () => {
  const a = avaliarProduto(normalizarResposta({ ...BRUTO_BISCOITO, nutriments: { proteins_100g: 8 } }, '1'))
  const claim = a.positivos.find((t) => /proteína/.test(t))
  assert.ok(claim)
  assert.match(claim, /energia não informada/)
})

test('açúcar adicionado casa por palavra inteira', () => {
  assert.equal(temAcucarAdicionado('Farinha, açúcar, sal'), true)
  assert.equal(temAcucarAdicionado('Xarope de glicose'), true)
  assert.equal(temAcucarAdicionado('Polpa de melancia, água'), false)
  assert.equal(temAcucarAdicionado('Aroma natural de caramelo'), false)
  assert.equal(temAcucarAdicionado('Leite integral'), false)
  assert.equal(temAcucarAdicionado(undefined), false)
})

// ---------------------------------------------------------------------------
// Força
// ---------------------------------------------------------------------------

test('1RM estimado bate com as fórmulas na faixa confiável', () => {
  assert.equal(estimar1RM(100, 1), 100)
  // Epley 100×(1+5/30)=116,67 · Brzycki 100×36/32=112,5 · média 114,58
  assert.ok(Math.abs(estimar1RM(100, 5) - 114.58) < 0.05)
  // Acima de 12 reps satura: 20 reps devolve o mesmo que 12
  assert.equal(estimar1RM(60, 20), estimar1RM(60, 12))
})

test('altura mexe no padrão na direção certa e dentro do teto', () => {
  const ref = alturaReferencia('M', 80)
  assert.ok(Math.abs(ref - 176) < 1)
  assert.equal(fatorAltura('agachamento', 'M', 80, Math.round(ref)), 1)

  const alto = fatorAltura('agachamento', 'M', 80, 195)
  const baixo = fatorAltura('agachamento', 'M', 80, 160)
  assert.ok(alto < 1, 'mais alto que a referência baixa o padrão esperado')
  assert.ok(baixo > 1, 'mais baixo que a referência sobe o padrão esperado')
  assert.ok(alto >= 0.92 && baixo <= 1.08, 'o ajuste respeita o teto de 8%')
})

test('altura pesa menos no terra que no agachamento', () => {
  const terra = fatorAltura('terra', 'M', 80, 195)
  const agacho = fatorAltura('agachamento', 'M', 80, 195)
  assert.ok(terra > agacho)
})

test('altura ausente ou absurda não mexe em nada', () => {
  assert.equal(fatorAltura('agachamento', 'M', 80, 0), 1)
  assert.equal(fatorAltura('agachamento', 'M', 80, 300), 1)
  assert.equal(fatorAltura('agachamento', 'M', 0, 180), 1)
})

test('fator de idade é 1 no pico e cai depois', () => {
  assert.equal(fatorIdade(25), 1)
  assert.ok(fatorIdade(45) < fatorIdade(35))
  assert.ok(fatorIdade(70) > 0.4)
})

// ---------------------------------------------------------------------------
// Figuras dos exercícios
// ---------------------------------------------------------------------------

test('todo exercício chega numa pose que existe', () => {
  const semPose = EXERCICIOS.filter((e) => !POSES[poseDoExercicio(e)])
  assert.deepEqual(semPose.map((e) => e.id), [])
})

test('nenhuma pose fica órfã', () => {
  const usadas = new Set(EXERCICIOS.map((e) => poseDoExercicio(e)))
  const orfas = Object.keys(POSES).filter((p) => !usadas.has(p as keyof typeof POSES))
  assert.deepEqual(orfas, [], 'pose desenhada que nenhum exercício alcança')
})

test('nenhuma articulação sai do quadro de 48×48', () => {
  const fora: string[] = []
  for (const [nome, pose] of Object.entries(POSES)) {
    for (const [junta, valor] of Object.entries(pose)) {
      if (!Array.isArray(valor) || valor.length !== 2 || typeof valor[0] !== 'number') continue
      const [x, y] = valor as [number, number]
      if (x < 2 || x > 46 || y < 2 || y > 46) fora.push(`${nome}.${junta} = ${x},${y}`)
    }
  }
  assert.deepEqual(fora, [])
})

test('os movimentos que mais se confundem caem em poses diferentes', () => {
  // Um erro de ordem nas regras junta estes pares, e o desenho passa a mentir.
  const par = (a: string, b: string) => {
    const pa = poseDoExercicio(EXERCICIOS.find((e) => e.id === a)!)
    const pb = poseDoExercicio(EXERCICIOS.find((e) => e.id === b)!)
    assert.notEqual(pa, pb, `${a} e ${b} não podem compartilhar o desenho`)
  }
  par('rosca-direta-barra', 'rosca-punho')
  par('remada-curvada', 'remada-alta')
  par('triceps-testa', 'triceps-corda')
  par('triceps-frances', 'triceps-corda')
  par('agachamento-livre', 'agachamento-bulgaro') // afundo, não agachamento
  par('flexao', 'flexora-em-pe')
  par('elevacao-pelvica', 'elevacao-pernas-barra')
})

test('cada exercício de referência mostra o desenho do próprio movimento', () => {
  const espera: [string, string][] = [
    ['supino-reto-barra', 'supino'],
    ['supino-maquina', 'supino'],
    ['agachamento-hack', 'agachamento'],
    ['leg-press-unilateral', 'leg-press'],
    ['barra-fixa-pronada', 'puxada'],
    ['terra-sumo', 'terra'],
    ['stiff', 'terra'],
    ['peck-deck', 'crucifixo'],
    ['face-pull', 'crucifixo-inverso'],
    ['prancha', 'prancha'],
    ['burpee', 'olimpico'],
    ['bike-spinning', 'bike'],
  ]
  for (const [id, pose] of espera) {
    assert.equal(poseDoExercicio(EXERCICIOS.find((e) => e.id === id)!), pose, id)
  }
})
