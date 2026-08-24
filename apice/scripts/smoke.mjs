/**
 * Smoke test do Ápice.
 *
 * Sobe o build de produção num navegador real, semeia um estado plausível e
 * percorre os caminhos que o usuário faz de verdade: registrar série e ver a
 * comparação mundial, concluir treino, registrar refeição pela tabela e abrir
 * o analisador sem chave de API. Falha se algum passo não acontecer ou se o
 * console soltar erro.
 *
 *   npm run build && npm run preview   # num terminal
 *   node scripts/smoke.mjs             # noutro
 *
 * Capturas ficam em ./capturas.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = process.env.APICE_URL ?? 'http://127.0.0.1:4173/'
const SAIDA = 'capturas'
const CHROMIUM = process.env.CHROMIUM_PATH // deixe vazio para usar o Chromium do Playwright

mkdirSync(SAIDA, { recursive: true })

const hoje = new Date()
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const diasAtras = (n) => {
  const d = new Date(hoje)
  d.setDate(d.getDate() - n)
  return iso(d)
}

const estado = {
  state: {
    perfil: {
      nome: 'Teste',
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
    onboardingConcluido: true,
    refeicoes: [],
    treinos: [],
    treinoAtivo: null,
    pesos: [
      { data: diasAtras(7), peso: 82.7 },
      { data: iso(hoje), peso: 82.0 },
    ],
    jogo: { xp: 300, conquistas: {}, streakAtual: 2, streakRecorde: 3, ultimoDiaAtivo: iso(hoje) },
    coach: [],
  },
  version: 1,
}

/** Resposta no formato do Open Food Facts, com as armadilhas que ela tem. */
const PRODUTO_FALSO = {
  status: 1,
  product: {
    product_name: 'Biscoito recheado sabor chocolate',
    brands: 'Marca Exemplo',
    quantity: '140 g',
    serving_quantity: '30',
    serving_size: '30 g (3 unidades)',
    ingredients_text_pt: 'Farinha de trigo, açúcar, gordura vegetal, cacau, xarope de glicose, sal.',
    nova_group: 4,
    additives_tags: ['en:e322', 'en:e500'],
    last_modified_t: 1700000000,
    categories_tags: ['en:biscuits'],
    nutriments: {
      'energy-kcal_100g': 480,
      proteins_100g: 6,
      carbohydrates_100g: 68,
      sugars_100g: 34,
      fat_100g: 20,
      'saturated-fat_100g': 9.5,
      fiber_100g: 2.1,
      sodium_100g: 0.32, // gramas na base, 320 mg no rótulo
    },
  },
}

const checagens = []
const conferir = (nome, ok) => {
  checagens.push({ nome, ok })
  console.log(`${ok ? '✓' : '✗'} ${nome}`)
}

const navegador = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {})
const contexto = await navegador.newContext({
  viewport: { width: 420, height: 900 },
  deviceScaleFactor: 2,
  locale: 'pt-BR',
})
const pagina = await contexto.newPage()

const erros = []
pagina.on('console', (m) => m.type() === 'error' && erros.push(m.text()))
pagina.on('pageerror', (e) => erros.push(`PAGEERROR: ${e.message}`))

await pagina.goto(URL)
await pagina.evaluate((s) => localStorage.setItem('apice-v1', JSON.stringify(s)), estado)
await pagina.goto(URL, { waitUntil: 'networkidle' })

// ------------------------------- Treino ------------------------------------
await pagina.getByRole('button', { name: 'Treino' }).first().click()
await pagina.getByRole('button', { name: 'Push', exact: true }).click()
await pagina.getByRole('button', { name: 'Iniciar treino' }).click()
await pagina.getByRole('button', { name: 'Adicionar exercício' }).click()
await pagina.getByPlaceholder('Supino, agachamento, polia…').fill('supino reto com barra')
await pagina.getByRole('button', { name: /Supino reto com barra/ }).first().click()
conferir('exercício entra no treino', (await pagina.getByText('Supino reto com barra').count()) > 0)

const numeros = pagina.locator('input[type="number"]')
await numeros.nth(0).fill('100')
await numeros.nth(1).fill('5')
await pagina.getByRole('button', { name: 'Registrar série' }).click()
await pagina.waitForTimeout(600)

conferir('série registrada mostra nível', (await pagina.getByText('Seu nível').count()) > 0)
conferir('série registrada mostra percentil mundial', (await pagina.getByText('Mundial').count()) > 0)
await pagina.screenshot({ path: `${SAIDA}/serie-registrada.png`, fullPage: true })

await pagina.getByRole('button', { name: 'Concluir treino' }).click()
await pagina.waitForTimeout(500)
conferir('treino concluído vira histórico', (await pagina.getByRole('button', { name: 'Iniciar treino' }).count()) > 0)

// ------------------------------- Nutrição ----------------------------------
await pagina.getByRole('button', { name: 'Comida' }).first().click()
await pagina.getByRole('button', { name: 'Tabela' }).click()
await pagina.getByPlaceholder('Arroz, frango, whey…').fill('whey')
await pagina.getByRole('button', { name: /Whey protein isolado/ }).first().click()
await pagina.getByRole('button', { name: /Adicionar/ }).click()
await pagina.getByRole('button', { name: /Salvar .* kcal/ }).click()
await pagina.waitForTimeout(500)
conferir('refeição pela tabela é salva', (await pagina.getByText('Whey protein isolado').count()) > 0)

await pagina.getByRole('button', { name: 'Foto' }).click()
await pagina.waitForTimeout(400)
conferir('analisador avisa quando falta a chave', (await pagina.getByText(/chave da Claude API/i).count()) > 0)
await pagina.keyboard.press('Escape')
await pagina.waitForTimeout(300)

// --------------------------- Código de barras -------------------------------
// A base de produtos é respondida por uma resposta fixa: o que se testa aqui é
// a leitura do app, não a disponibilidade do Open Food Facts.
await pagina.route('**/world.openfoodfacts.org/**', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PRODUTO_FALSO) }),
)

await pagina.getByRole('button', { name: 'Código' }).click()
// Sem câmera no navegador headless, o app cai para a digitação — que é
// justamente o caminho que precisa funcionar quando a câmera falha.
await pagina.waitForTimeout(2500)
conferir('scanner cai para digitação sem câmera', (await pagina.getByText(/Código de barras/i).count()) > 0)

const campoCodigo = pagina.locator('input[inputmode="numeric"]').last()
await campoCodigo.fill('7891000100104') // dígito verificador errado de propósito
await pagina.waitForTimeout(300)
conferir(
  'código com dígito verificador errado é barrado',
  await pagina.getByRole('button', { name: /Buscar/ }).first().isDisabled(),
)

await campoCodigo.fill('7891000100103')
await pagina.getByRole('button', { name: /Buscar/ }).first().click()
await pagina.waitForTimeout(900)
const fichaProduto = await pagina.locator('body').innerText()
conferir('produto é exibido com o nome da base', /Biscoito recheado/i.test(fichaProduto))
conferir('marcador ALTO EM dispara acima do limite', /Alto em açúcar/i.test(fichaProduto))
conferir('sódio abaixo do limite não vira marcador', !/Alto em sódio/i.test(fichaProduto))
conferir('sódio é convertido de grama para miligrama', /320 mg/.test(fichaProduto))
conferir('a procedência do dado aparece', /Open Food Facts/i.test(fichaProduto))

await pagina.getByRole('button', { name: /Adicionar ao dia/ }).click()
await pagina.waitForTimeout(600)
conferir(
  'produto escaneado entra no dia com a procedência',
  (await pagina.getByText(/Rótulo do fabricante/i).count()) > 0,
)

// -------------------------------- Fechamento -------------------------------
conferir('sem erros de console', erros.length === 0)
if (erros.length) console.error(erros.join('\n'))

await navegador.close()

const falhas = checagens.filter((c) => !c.ok).length
console.log(`\n${checagens.length - falhas}/${checagens.length} checagens passaram`)
process.exit(falhas === 0 ? 0 : 1)
