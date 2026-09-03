/**
 * A rampa de publicação automática.
 *
 * O contador de lotes vivia como um número no arquivo de configuração, e nada
 * o incrementava nem o zerava. Na prática, alguém digitava 5 e a publicação
 * automática abria — a rampa era decoração.
 *
 * Agora ele é DERIVADO DO LOG, como a fila de aprovação: conta quantos lotes
 * seguidos foram aprovados sem alteração, e qualquer alteração zera a contagem.
 * Número que ninguém pode digitar é número que ninguém digita errado.
 */
import { lerLog } from './log.mjs'

/**
 * Quantos lotes seguidos foram aprovados sem nenhuma alteração.
 *
 * "Seguidos" é o ponto: a contagem varre do fim para o começo e para no
 * primeiro lote alterado. Cinco aprovações separadas por uma correção no meio
 * não são cinco lotes limpos.
 */
export function lotesLimposSeguidos(registros = lerLog()) {
  let n = 0
  for (let i = registros.length - 1; i >= 0; i--) {
    const acao = registros[i].acao
    if (acao === 'conteudo.lote_alterado') break
    if (acao === 'conteudo.lote_aprovado') n += 1
  }
  return n
}

/**
 * A rampa já fechou?
 *
 * Repare no nome: `fechada` não é `publicação liberada`. A rampa é condição
 * NECESSÁRIA, não suficiente — mesmo com os cinco lotes limpos, a publicação
 * automática só abre quando uma pessoa virar `publicacao_automatica_liberada`
 * na configuração. Uma função chamada `publicacaoLiberada` devolvendo `true`
 * enquanto a publicação segue bloqueada é exatamente o tipo de nome que faz
 * alguém publicar sem querer.
 */
export function estadoDaRampa(config, registros = lerLog()) {
  const necessarios = config?.conteudo?.lotes_necessarios ?? 5
  const limpos = lotesLimposSeguidos(registros)
  return { fechada: limpos >= necessarios, limpos, necessarios }
}
