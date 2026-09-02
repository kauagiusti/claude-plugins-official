/**
 * Log append-only com cadeia de hash.
 *
 * O prompt exige um registro "fora do alcance de edição do agente". Num
 * arquivo comum isso é só uma promessa: quem escreve também pode reescrever.
 * A cadeia de hash troca a promessa por uma propriedade verificável — cada
 * linha carrega o hash da anterior, então apagar ou alterar qualquer registro
 * quebra a cadeia de todos os seguintes, e a quebra aparece na verificação.
 *
 * Isso não impede a edição. Impede a edição SILENCIOSA, que é o que interessa:
 * um log adulterado deixa de ser um log confiável e passa a ser um alarme.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'
import { CAMINHO_LOG } from './config.mjs'

const GENESE = '0'.repeat(64)

const hashDe = (registro) =>
  createHash('sha256')
    .update(`${registro.anterior}|${registro.em}|${registro.acao}|${registro.modo}|${JSON.stringify(registro.dados ?? null)}`)
    .digest('hex')

export function lerLog(caminho = CAMINHO_LOG) {
  if (!existsSync(caminho)) return []
  return readFileSync(caminho, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
}

/**
 * Registra uma ação. Não existe função de apagar nem de editar neste módulo,
 * e isso é deliberado: o que não tem API não é chamado por engano.
 *
 * `caminho` existe para o teste poder usar um arquivo descartável. Sem ele, os
 * testes escreveriam no log da operação — e um log com linha de teste no meio
 * é um log que ninguém consegue usar como prova depois.
 */
export function registrar({ acao, modo, dados, confirmadoPor }, caminho = CAMINHO_LOG) {
  if (!acao) throw new Error('registrar() exige `acao`')
  if (!['autonoma', 'confirmada'].includes(modo)) {
    throw new Error("registrar() exige `modo` 'autonoma' ou 'confirmada'")
  }
  if (modo === 'confirmada' && !confirmadoPor) {
    // Ação de Nível 3 sem quem confirmou é um registro que não serve para
    // auditar nada — é exatamente a linha que alguém vai querer conferir.
    throw new Error("modo 'confirmada' exige `confirmadoPor`")
  }

  const anteriores = lerLog(caminho)
  const anterior = anteriores.length ? anteriores[anteriores.length - 1].hash : GENESE

  const registro = {
    anterior,
    em: new Date().toISOString(),
    acao,
    modo,
    dados: dados ?? null,
    ...(confirmadoPor ? { confirmadoPor } : {}),
  }
  registro.hash = hashDe(registro)

  mkdirSync(dirname(caminho), { recursive: true })
  appendFileSync(caminho, JSON.stringify(registro) + '\n', 'utf8')
  return registro
}

/** Confere a cadeia inteira. Devolve o primeiro ponto de quebra, se houver. */
export function verificarCadeia(registros = lerLog()) {
  let esperado = GENESE
  for (const [i, r] of registros.entries()) {
    if (r.anterior !== esperado) {
      return { intacta: false, linha: i + 1, motivo: 'elo anterior não confere — registro removido ou reordenado' }
    }
    if (hashDe(r) !== r.hash) {
      return { intacta: false, linha: i + 1, motivo: 'conteúdo alterado depois de gravado' }
    }
    esperado = r.hash
  }
  return { intacta: true, registros: registros.length }
}
