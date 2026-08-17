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

// -------------------------------- Fechamento -------------------------------
conferir('sem erros de console', erros.length === 0)
if (erros.length) console.error(erros.join('\n'))

await navegador.close()

const falhas = checagens.filter((c) => !c.ok).length
console.log(`\n${checagens.length - falhas}/${checagens.length} checagens passaram`)
process.exit(falhas === 0 ? 0 : 1)
