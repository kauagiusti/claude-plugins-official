/**
 * Gera as capturas de tela para o App Store Connect.
 *
 * A Apple exige capturas na resolução exata do iPhone 6.7" (1290 × 2796).
 * Aqui elas saem do app real, com dados de demonstração plausíveis — nada de
 * mockup: o que aparece na loja é o que a pessoa vai ver.
 *
 *   npm run build && npm run preview   # num terminal
 *   node scripts/capturas-loja.mjs     # noutro
 *
 * Saída: ./capturas-loja/
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = process.env.APICE_URL ?? 'http://127.0.0.1:4173/'
const SAIDA = 'capturas-loja'
const CHROMIUM = process.env.CHROMIUM_PATH

// 430 × 932 com escala 3 = 1290 × 2796, o tamanho pedido para o 6.7".
const LARGURA = 430
const ALTURA = 932
const ESCALA = 3

mkdirSync(SAIDA, { recursive: true })

const hoje = new Date()
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const diasAtras = (n) => {
  const d = new Date(hoje)
  d.setDate(d.getDate() - n)
  return iso(d)
}
const item = (nome, q, kcal, p, c, g, f = 1) => ({
  id: Math.random().toString(36).slice(2),
  nome,
  quantidade: q,
  unidade: 'g',
  kcal,
  proteina: p,
  carbo: c,
  gordura: g,
  fibra: f,
})

const serie = (reps, peso, e1rm) => ({ id: Math.random().toString(36).slice(2), reps, peso, concluida: true, e1rm })

const estado = {
  state: {
    perfil: {
      nome: 'Kaua',
      sexo: 'M',
      nascimento: '1998-04-12',
      alturaCm: 178,
      pesoKg: 82,
      atividade: 'intenso',
      objetivo: 'recomposicao',
      ajusteKcal: 0,
      proteinaPorKg: 1.9,
      gorduraPorKg: 0.8,
      metasManuais: null,
    },
    apiKey: '',
    modelo: 'claude-opus-5',
    analisesFeitas: 64,
    onboardingConcluido: true,
    refeicoes: [
      {
        id: 'r1',
        data: iso(hoje),
        hora: '08:10',
        tipo: 'cafe',
        titulo: 'Café — ovos mexidos, pão integral e café',
        origem: 'foto',
        recomendacao: 'Bom início de dia. Mantenha a proteína alta no almoço para fechar com folga.',
        itens: [
          item('Ovo mexido', 150, 215, 20, 1, 14, 0),
          item('Pão integral', 50, 127, 4.7, 21, 1.9, 3.5),
          item('Café sem açúcar', 200, 4, 0.4, 0.6, 0),
        ],
      },
      {
        id: 'r2',
        data: iso(hoje),
        hora: '12:40',
        tipo: 'almoco',
        titulo: 'Almoço — frango, arroz, feijão e salada',
        origem: 'foto',
        itens: [
          item('Peito de frango grelhado', 180, 297, 56, 0, 6.5, 0),
          item('Arroz branco cozido', 150, 192, 3.8, 42, 0.3, 2.4),
          item('Feijão carioca', 110, 84, 5.3, 15, 0.6, 9.4),
          item('Salada de folhas', 80, 12, 1.1, 2.3, 0.2, 1.8),
        ],
      },
      {
        id: 'r3',
        data: iso(hoje),
        hora: '16:20',
        tipo: 'lanche_tarde',
        titulo: 'Lanche — iogurte grego com frutas',
        origem: 'tabela',
        itens: [item('Iogurte grego zero', 170, 102, 17, 6.8, 0, 0), item('Morango', 120, 36, 1.1, 8.2, 0.4, 2)],
      },
    ],
    treinos: [
      {
        id: 't1',
        data: diasAtras(1),
        inicio: new Date().toISOString(),
        fim: new Date().toISOString(),
        nome: 'Push',
        exercicios: [
          { id: 's1', exercicioId: 'supino-reto-barra', series: [serie(8, 90, 112), serie(6, 95, 113), serie(5, 100, 115)] },
          { id: 's2', exercicioId: 'desenvolvimento-militar', series: [serie(8, 55, 68), serie(7, 57.5, 70)] },
          { id: 's3', exercicioId: 'triceps-corda', series: [serie(12, 35, 48)] },
        ],
      },
      {
        id: 't2',
        data: diasAtras(3),
        inicio: new Date().toISOString(),
        fim: new Date().toISOString(),
        nome: 'Pernas',
        exercicios: [
          { id: 's4', exercicioId: 'agachamento-livre', series: [serie(5, 140, 160), serie(5, 145, 165)] },
          { id: 's5', exercicioId: 'terra', series: [serie(3, 180, 194)] },
          { id: 's6', exercicioId: 'leg-press-45', series: [serie(10, 260, 333)] },
        ],
      },
      {
        id: 't3',
        data: diasAtras(5),
        inicio: new Date().toISOString(),
        fim: new Date().toISOString(),
        nome: 'Pull',
        exercicios: [
          { id: 's7', exercicioId: 'barra-fixa-pronada', series: [serie(9, 0, 102)] },
          { id: 's8', exercicioId: 'remada-curvada', series: [serie(8, 85, 105)] },
        ],
      },
    ],
    treinoAtivo: null,
    pesos: [
      { data: diasAtras(28), peso: 85.2 },
      { data: diasAtras(21), peso: 84.4 },
      { data: diasAtras(14), peso: 83.6 },
      { data: diasAtras(7), peso: 82.7 },
      { data: iso(hoje), peso: 82.0 },
    ],
    jogo: {
      xp: 4820,
      conquistas: Object.fromEntries(
        ['primeiro-treino', 'primeira-foto', 'dez-treinos', 'acima-media', 'supino-peso', 'top-20', 'streak-7'].map(
          (c) => [c, new Date().toISOString()],
        ),
      ),
      streakAtual: 12,
      streakRecorde: 19,
      ultimoDiaAtivo: iso(hoje),
    },
    coach: [],
  },
  version: 1,
}

const navegador = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {})
const ctx = await navegador.newContext({
  viewport: { width: LARGURA, height: ALTURA },
  deviceScaleFactor: ESCALA,
  locale: 'pt-BR',
  isMobile: true,
  hasTouch: true,
})
const pagina = await ctx.newPage()

await pagina.goto(URL)
await pagina.evaluate((s) => localStorage.setItem('apice-v1', JSON.stringify(s)), estado)
await pagina.goto(URL, { waitUntil: 'networkidle' })
await pagina.waitForTimeout(900)

async function capturar(nome) {
  await pagina.waitForTimeout(700)
  await pagina.screenshot({ path: `${SAIDA}/${nome}.png` })
  console.log(`${SAIDA}/${nome}.png  ${LARGURA * ESCALA}×${ALTURA * ESCALA}`)
}

// 1 — Resumo do dia
await capturar('1-hoje')

// 2 — Diário de refeições
await pagina.getByRole('button', { name: 'Comida' }).first().click()
await capturar('2-nutricao')

// 3 — Treino em andamento com a comparação mundial
await pagina.getByRole('button', { name: 'Treino' }).first().click()
await pagina.waitForTimeout(400)
await pagina.getByRole('button', { name: 'Push', exact: true }).click()
await pagina.getByRole('button', { name: 'Iniciar treino' }).click()
await pagina.getByRole('button', { name: 'Adicionar exercício' }).click()
await pagina.getByPlaceholder('Supino, agachamento, polia…').fill('supino reto com barra')
await pagina.getByRole('button', { name: /Supino reto com barra/ }).first().click()
const numeros = pagina.locator('input[type="number"]')
await numeros.nth(0).fill('100')
await numeros.nth(1).fill('5')
await pagina.getByRole('button', { name: 'Registrar série' }).click()
await capturar('3-nivel-de-forca')

// Descarta o treino de demonstração para as telas seguintes.
await pagina.locator('header button').last().click()
await pagina.getByRole('button', { name: 'Descartar' }).click()
await pagina.waitForTimeout(400)

// 4 — Ranking
await pagina.getByRole('button', { name: 'Ranking' }).first().click()
await capturar('4-ranking')

// 5 — Evolução
await pagina.getByRole('button', { name: 'Evolução' }).click()
await capturar('5-evolucao')

// 6 — Conquistas
await pagina.getByRole('button', { name: 'Conquistas' }).click()
await capturar('6-conquistas')

// 7 — Biblioteca de exercícios
await pagina.getByRole('button', { name: 'Treino' }).first().click()
await pagina.waitForTimeout(300)
await pagina.getByRole('button', { name: 'Iniciar treino' }).click()
await pagina.getByRole('button', { name: 'Adicionar exercício' }).click()
await capturar('7-exercicios')

await navegador.close()
console.log('\nCapturas prontas para o App Store Connect (iPhone 6.7").')
