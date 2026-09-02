#!/usr/bin/env node
/**
 * Testes do que decide dinheiro e do que guarda o histórico.
 *
 * Este código autoriza reembolso e é a única auditoria da operação. Um erro
 * aqui não aparece na tela — aparece no extrato, semanas depois. Por isso os
 * testes cobrem os casos que passam despercebidos: o teto que só vale por
 * transação, o dia que vira no fuso errado, a linha do log apagada em silêncio.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { estadoDaTrava, offsetMinutos } from './config.mjs'
import { verificarCadeia } from './log.mjs'
import { avaliarReembolso, reembolsosGastos } from './limites.mjs'

const CHEIA = {
  dinheiro: {
    moeda: 'BRL',
    reembolso_max_por_pedido: 150,
    reembolso_max_acumulado_dia: 400,
    reembolso_max_acumulado_semana: 1200,
    ads_orcamento_mes: 900,
    ads_gasto_max_dia: 60,
  },
  escalonamento: {
    fuso_horario_utc_offset: -3,
    janela_silencio: { de: '22:00', ate: '07:00' },
    categorias_que_furam_silencio: [],
    max_escalonamentos_por_hora: 3,
    telefone_emergencia: '+5511999999999',
    email_escalonamento: 'kaua@exemplo.com',
    exemplos_p1: ['pagamento fora do ar'],
    exemplos_p2: ['cliente pedindo troca'],
  },
  conteudo: { publicacao_automatica_liberada: false, lotes_aprovados_sem_alteracao: 0, lotes_necessarios: 5 },
}

const clone = (o) => JSON.parse(JSON.stringify(o))
const reembolso = (valor, minutosAtras) => ({
  acao: 'reembolso.executado',
  em: new Date(Date.now() - minutosAtras * 60000).toISOString(),
  dados: { valor },
})

// --------------------------------- trava ------------------------------------

test('config em branco tranca tudo e deixa em somente-leitura', () => {
  const vazia = { dinheiro: { moeda: '____' }, escalonamento: { janela_silencio: {} }, conteudo: {} }
  const e = estadoDaTrava(vazia)
  assert.equal(e.somenteLeitura, true)
  for (const [nome, c] of Object.entries(e.capacidades)) {
    assert.equal(c.liberada, false, `${nome} não deveria estar liberada`)
  }
})

test('a trava é por capacidade, não uma chave geral', () => {
  // Quem preencheu o dinheiro mas não a janela de silêncio pode reembolsar sem
  // poder ligar de madrugada. Trava única faria preencher qualquer coisa só
  // para destravar o resto — que é como limite vira ficção.
  const parcial = clone(CHEIA)
  parcial.escalonamento.telefone_emergencia = '____'
  parcial.escalonamento.exemplos_p1 = []
  const e = estadoDaTrava(parcial)
  assert.equal(e.capacidades.reembolso.liberada, true)
  assert.equal(e.capacidades.ligacao.liberada, false)
  assert.equal(e.capacidades.escalonamento.liberada, false)
  assert.equal(e.somenteLeitura, false)
})

test('zero e string vazia não contam como preenchido', () => {
  const zerada = clone(CHEIA)
  zerada.dinheiro.reembolso_max_por_pedido = 0
  assert.equal(estadoDaTrava(zerada).capacidades.reembolso.liberada, false)

  const vazia = clone(CHEIA)
  vazia.escalonamento.email_escalonamento = '   '
  assert.equal(estadoDaTrava(vazia).capacidades.escalonamento.liberada, false)
})

test('publicação só abre com os cinco lotes aprovados', () => {
  const quase = clone(CHEIA)
  quase.conteudo = { publicacao_automatica_liberada: true, lotes_aprovados_sem_alteracao: 4, lotes_necessarios: 5 }
  assert.equal(estadoDaTrava(quase).capacidades.publicacao.liberada, false)

  quase.conteudo.lotes_aprovados_sem_alteracao = 5
  assert.equal(estadoDaTrava(quase).capacidades.publicacao.liberada, true)

  // Marcar como liberada sem os lotes não vale — as duas condições valem juntas.
  const forcada = clone(CHEIA)
  forcada.conteudo = { publicacao_automatica_liberada: true, lotes_aprovados_sem_alteracao: 0, lotes_necessarios: 5 }
  assert.equal(estadoDaTrava(forcada).capacidades.publicacao.liberada, false)
})

test('fuso ausente cai em Brasília, não em UTC', () => {
  assert.equal(offsetMinutos(CHEIA), -180)
  assert.equal(offsetMinutos({ escalonamento: {} }), -180)
})

// ------------------------------- reembolso ----------------------------------

test('sem config, nenhum reembolso passa', () => {
  const r = avaliarReembolso(10, { config: { dinheiro: { moeda: '____' } }, registros: [] })
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /trava/)
})

test('teto por pedido barra o valor alto', () => {
  const r = avaliarReembolso(200, { config: CHEIA, registros: [] })
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /por pedido/)
})

test('o acumulado do dia barra o que o teto por pedido deixaria passar', () => {
  // Este é o buraco do rascunho original: três de 149 passam um a um.
  const registros = [reembolso(149, 60), reembolso(149, 120)]
  const r = avaliarReembolso(149, { config: CHEIA, registros })
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /teto do dia/)
  assert.equal(r.gastos.dia, 298)
})

test('o acumulado da semana barra mesmo com o dia limpo', () => {
  const registros = [1, 2, 3].map((d) => reembolso(390, d * 24 * 60 + 30))
  const r = avaliarReembolso(100, { config: CHEIA, registros })
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /semana/)
})

test('a semana é corrida, não do calendário', () => {
  // Um reembolso de 8 dias atrás não conta; um de 6 dias conta. Semana de
  // calendário criaria a segunda-feira em que tudo é permitido de novo.
  const antigo = [reembolso(1150, 8 * 24 * 60)]
  const recente = [reembolso(1150, 6 * 24 * 60)]
  assert.equal(avaliarReembolso(150, { config: CHEIA, registros: antigo }).permitido, true)
  assert.equal(avaliarReembolso(150, { config: CHEIA, registros: recente }).permitido, false)
})

test('avisa aos 80% antes de bater no teto', () => {
  const r = avaliarReembolso(50, { config: CHEIA, registros: [reembolso(280, 30)] })
  assert.equal(r.permitido, true)
  assert.ok(r.avisos.some((a) => /teto do dia/.test(a)), JSON.stringify(r.avisos))
})

test('valor inválido é recusado, não arredondado', () => {
  for (const v of [0, -10, NaN, undefined]) {
    assert.equal(avaliarReembolso(v, { config: CHEIA, registros: [] }).permitido, false)
  }
})

test('só reembolso executado entra na conta', () => {
  // Avaliar não é gastar. Se a avaliação contasse, consultar o teto o consumiria.
  const registros = [
    { acao: 'reembolso.avaliado', em: new Date().toISOString(), dados: { valor: 900 } },
    { acao: 'email.triagem', em: new Date().toISOString(), dados: { valor: 900 } },
    reembolso(50, 10),
  ]
  assert.equal(reembolsosGastos(new Date(), CHEIA, registros).dia, 50)
})

// ---------------------------------- log -------------------------------------

/** Log descartável: teste não escreve no arquivo da operação. */
function comLogTemporario(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'jarvis-'))
  try {
    return fn(join(dir, 'acoes.jsonl'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('a cadeia denuncia conteúdo alterado', async () => {
  const { registrar, lerLog } = await import('./log.mjs')
  comLogTemporario((caminho) => {
    registrar({ acao: 'a', modo: 'autonoma', dados: { v: 1 } }, caminho)
    registrar({ acao: 'b', modo: 'autonoma', dados: { v: 2 } }, caminho)
    const registros = lerLog(caminho)
    assert.equal(verificarCadeia(registros).intacta, true)

    const adulterado = JSON.parse(JSON.stringify(registros))
    adulterado[0].dados.v = 999
    const r = verificarCadeia(adulterado)
    assert.equal(r.intacta, false)
    assert.match(r.motivo, /alterado/)
  })
})

test('a cadeia denuncia registro removido do meio', async () => {
  const { registrar, lerLog } = await import('./log.mjs')
  comLogTemporario((caminho) => {
    for (const n of ['a', 'b', 'c']) registrar({ acao: n, modo: 'autonoma' }, caminho)
    const registros = lerLog(caminho)
    assert.equal(registros.length, 3)

    const semOMeio = [registros[0], registros[2]]
    const r = verificarCadeia(semOMeio)
    assert.equal(r.intacta, false)
    assert.match(r.motivo, /removido|reordenado/)
  })
})

test('ação confirmada exige quem confirmou', async () => {
  const { registrar } = await import('./log.mjs')
  comLogTemporario((caminho) => {
    assert.throws(() => registrar({ acao: 'reembolso', modo: 'confirmada' }, caminho), /confirmadoPor/)
    assert.throws(() => registrar({ acao: 'x', modo: 'inventado' }, caminho), /autonoma/)
    assert.throws(() => registrar({ modo: 'autonoma' }, caminho), /acao/)
  })
})

test('o módulo de log não expõe como apagar', async () => {
  const modulo = await import('./log.mjs')
  const nomes = Object.keys(modulo)
  for (const proibido of ['apagar', 'remover', 'editar', 'limpar', 'truncar']) {
    assert.ok(!nomes.includes(proibido), `log.mjs não deve exportar ${proibido}`)
  }
  assert.deepEqual(nomes.sort(), ['lerLog', 'registrar', 'verificarCadeia'])
})

test('log vazio é uma cadeia íntegra, não um erro', () => {
  assert.deepEqual(verificarCadeia([]), { intacta: true, registros: 0 })
})
