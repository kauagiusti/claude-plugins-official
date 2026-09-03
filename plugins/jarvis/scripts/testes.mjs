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
import { agregar, dentroDoSilencio, notificadosNaUltimaHora, planejarNotificacao } from './escalonamento.mjs'
import { avaliarAds, gastoEmAds } from './ads.mjs'
import { lotesLimposSeguidos, estadoDaRampa } from './conteudo.mjs'

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
  conteudo: { publicacao_automatica_liberada: false, lotes_necessarios: 5 },
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
  const ligada = clone(CHEIA)
  ligada.conteudo = { publicacao_automatica_liberada: true, lotes_necessarios: 5 }

  assert.equal(estadoDaTrava(ligada, { lotesLimpos: 4 }).capacidades.publicacao.liberada, false)
  assert.equal(estadoDaTrava(ligada, { lotesLimpos: 5 }).capacidades.publicacao.liberada, true)

  // As duas condições valem juntas: lotes sem o interruptor não abre.
  assert.equal(estadoDaTrava(CHEIA, { lotesLimpos: 9 }).capacidades.publicacao.liberada, false)
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

// ---------------------------------------------------------------------------
// Escalonamento
// ---------------------------------------------------------------------------

const ESC = {
  escalonamento: {
    fuso_horario_utc_offset: -3,
    janela_silencio: { de: '22:00', ate: '07:00' },
    categorias_que_furam_silencio: [],
    max_escalonamentos_por_hora: 3,
    telefone_emergencia: '+5511999999999',
    email_escalonamento: 'kaua@exemplo.com',
    exemplos_p1: ['pagamento fora do ar'],
    exemplos_p2: ['pedido de troca'],
  },
}

/**
 * Instante em UTC correspondente a uma hora local de Brasília (-03).
 *
 * Via Date.UTC, e não concatenando string: somar 3 às 23 horas dá "26:00", que
 * é uma data inválida e faz o teste passar por engano quando devia falhar.
 */
const emBrasilia = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(Date.UTC(2026, 8, 3, h, m) + 3 * 3600 * 1000)
}

const notificado = (causa, minutosAtras) => ({
  acao: 'escalonamento.notificado',
  em: new Date(Date.now() - minutosAtras * 60000).toISOString(),
  dados: { causa },
})

test('a janela de silêncio funciona atravessando a meia-noite', () => {
  // Comparação ingênua faria 22:00–07:00 nunca valer, e a janela deixaria de
  // existir sem ninguém notar até a primeira ligação de madrugada.
  assert.equal(dentroDoSilencio(emBrasilia('00:30'), ESC), true)
  assert.equal(dentroDoSilencio(emBrasilia('23:00'), ESC), true)
  assert.equal(dentroDoSilencio(emBrasilia('06:59'), ESC), true)
  assert.equal(dentroDoSilencio(emBrasilia('07:00'), ESC), false)
  assert.equal(dentroDoSilencio(emBrasilia('12:00'), ESC), false)
  assert.equal(dentroDoSilencio(emBrasilia('21:59'), ESC), false)
})

test('janela que não atravessa a meia-noite também vale', () => {
  const diurna = { escalonamento: { ...ESC.escalonamento, janela_silencio: { de: '13:00', ate: '14:00' } } }
  assert.equal(dentroDoSilencio(emBrasilia('13:30'), diurna), true)
  assert.equal(dentroDoSilencio(emBrasilia('12:30'), diurna), false)
  assert.equal(dentroDoSilencio(emBrasilia('14:00'), diurna), false)
})

test('janela ausente ou degenerada não silencia nada', () => {
  assert.equal(dentroDoSilencio(new Date(), { escalonamento: {} }), false)
  const vazia = { escalonamento: { janela_silencio: { de: '____', ate: '____' } } }
  assert.equal(dentroDoSilencio(new Date(), vazia), false)
  const igual = { escalonamento: { janela_silencio: { de: '08:00', ate: '08:00' } } }
  assert.equal(dentroDoSilencio(new Date(), igual), false)
})

test('agregação junta por causa e herda a pior prioridade', () => {
  const grupos = agregar([
    { causa: 'pagamento-recusado', afetado: '#1', prioridade: 'P2' },
    { causa: 'pagamento-recusado', afetado: '#2', prioridade: 'P1' },
    { causa: 'pagamento-recusado', afetado: '#3', prioridade: 'P2' },
    { causa: 'estoque-zerado', afetado: 'SKU-9', prioridade: 'P2' },
  ])
  assert.equal(grupos.length, 2)
  assert.equal(grupos[0].causa, 'pagamento-recusado')
  assert.equal(grupos[0].ocorrencias, 3)
  assert.equal(grupos[0].prioridade, 'P1')
})

test('cinquenta pedidos travados são um alerta, não cinquenta', () => {
  const eventos = Array.from({ length: 50 }, (_, i) => ({
    causa: 'gateway-fora',
    afetado: `#${1000 + i}`,
    prioridade: 'P1',
  }))
  const grupos = agregar(eventos)
  assert.equal(grupos.length, 1)
  assert.equal(grupos[0].ocorrencias, 50)
})

test('P3 nunca notifica', () => {
  const p = planejarNotificacao({ causa: 'x', prioridade: 'P3' }, { config: ESC, registros: [] })
  assert.equal(p.notificar, false)
  assert.match(p.motivo, /P3/)
})

test('sem exemplos de P1 e P2, P1 é rebaixado', () => {
  // Na ausência de critério, ninguém é acordado.
  const semExemplos = { escalonamento: { ...ESC.escalonamento, exemplos_p1: [], exemplos_p2: [] } }
  const p = planejarNotificacao(
    { causa: 'x', prioridade: 'P1' },
    { config: semExemplos, registros: [], minutosDesdeAbertura: 30, agora: emBrasilia('12:00') },
  )
  assert.equal(p.prioridade, 'P2')
  assert.equal(p.rebaixado, true)
  // Rebaixado para P2, o degrau de 30 min é push, nunca ligação.
  assert.equal(p.canal, 'push')
})

test('a escada sobe com o tempo, e só P1 chega ao telefone', () => {
  const plano = (min, prioridade) =>
    planejarNotificacao(
      { causa: `c${min}${prioridade}`, prioridade },
      { config: ESC, registros: [], minutosDesdeAbertura: min, agora: emBrasilia('12:00') },
    )
  assert.equal(plano(0, 'P1').canal, 'push+email')
  assert.equal(plano(6, 'P1').canal, 'push')
  assert.equal(plano(21, 'P1').canal, 'sms')
  assert.equal(plano(31, 'P1').canal, 'ligacao')

  assert.equal(plano(21, 'P2').canal, 'push')
  assert.equal(plano(600, 'P2').canal, 'push')
})

test('a mesma causa não é notificada duas vezes em 15 minutos', () => {
  const p = planejarNotificacao(
    { causa: 'gateway-fora', prioridade: 'P1' },
    { config: ESC, registros: [notificado('gateway-fora', 3)], minutosDesdeAbertura: 30, agora: emBrasilia('12:00') },
  )
  assert.equal(p.notificar, false)
  assert.match(p.motivo, /15 minutos/)
})

test('teto por hora manda para o resumo consolidado', () => {
  const registros = ['a', 'b', 'c'].map((c) => notificado(c, 10))
  const p = planejarNotificacao(
    { causa: 'nova', prioridade: 'P1' },
    { config: ESC, registros, minutosDesdeAbertura: 0, agora: emBrasilia('12:00') },
  )
  assert.equal(p.notificar, false)
  assert.equal(p.consolidar, true)
  assert.equal(notificadosNaUltimaHora(new Date(), registros), 3)
})

test('a janela de silêncio adia, e a lista de exceções fura', () => {
  const adiado = planejarNotificacao(
    { causa: 'gateway-fora', prioridade: 'P1' },
    { config: ESC, registros: [], minutosDesdeAbertura: 30, agora: emBrasilia('03:00') },
  )
  assert.equal(adiado.notificar, false)
  assert.equal(adiado.adiado, true)

  const comExcecao = { escalonamento: { ...ESC.escalonamento, categorias_que_furam_silencio: ['gateway-fora'] } }
  const fura = planejarNotificacao(
    { causa: 'gateway-fora', prioridade: 'P1' },
    { config: comExcecao, registros: [], minutosDesdeAbertura: 30, agora: emBrasilia('03:00') },
  )
  assert.equal(fura.notificar, true)
  assert.equal(fura.canal, 'ligacao')
})

test('degrau de telefone sem telefone cai para push+email, não promete ligação', () => {
  // Prometer ligação sem canal é a pior forma de falhar: silenciosa.
  const semTelefone = { escalonamento: { ...ESC.escalonamento, telefone_emergencia: '____' } }
  const p = planejarNotificacao(
    { causa: 'x', prioridade: 'P1' },
    { config: semTelefone, registros: [], minutosDesdeAbertura: 31, agora: emBrasilia('12:00') },
  )
  assert.equal(p.notificar, true)
  assert.equal(p.canal, 'push+email')
  assert.match(p.motivo, /telefone/)
})

// ---------------------------------------------------------------------------
// Fila de aprovação
// ---------------------------------------------------------------------------

test('pendência entra na fila e sai quando decidida', async () => {
  const { enfileirar, listar, decidir } = await import('./pendencias.mjs')
  const { lerLog } = await import('./log.mjs')
  comLogTemporario((caminho) => {
    const id = enfileirar({ alvo: 'publicacao', dados: { plataforma: 'tiktok' } }, caminho)
    assert.equal(listar(lerLog(caminho)).length, 1)

    decidir(id, 'aprovada', 'kaua', { registros: lerLog(caminho), config: CHEIA, caminho })
    assert.equal(listar(lerLog(caminho)).length, 0)

    // O histórico continua no log: fila vazia não é fila apagada.
    const decisoes = lerLog(caminho).filter((r) => r.acao === 'pendencia.decidida')
    assert.equal(decisoes.length, 1)
    assert.equal(decisoes[0].confirmadoPor, 'kaua')
  })
})

test('decidir exige quem decidiu, veredito válido e pendência aberta', async () => {
  const { enfileirar, decidir } = await import('./pendencias.mjs')
  const { lerLog } = await import('./log.mjs')
  comLogTemporario((caminho) => {
    const id = enfileirar({ alvo: 'publicacao' }, caminho)
    const registros = lerLog(caminho)
    assert.throws(() => decidir(id, 'aprovada', '', { registros, caminho }), /quem decidiu/)
    assert.throws(() => decidir(id, 'talvez', 'kaua', { registros, caminho }), /aprovada/)
    assert.throws(() => decidir('naoexiste', 'aprovada', 'kaua', { registros, caminho }), /não está aberta/)
  })
})

test('reembolso é reavaliado na hora da aprovação, não do pedido', async () => {
  const { enfileirar, decidir, listar } = await import('./pendencias.mjs')
  const { lerLog } = await import('./log.mjs')
  comLogTemporario((caminho) => {
    const id = enfileirar({ alvo: 'reembolso', dados: { valor: 140, pedido: '#1042' } }, caminho)

    // Entre pedir e aprovar, saíram outros reembolsos e o teto do dia encheu.
    const registros = [...lerLog(caminho), reembolso(149, 30), reembolso(149, 20)]
    const r = decidir(id, 'aprovada', 'kaua', { registros, config: CHEIA, caminho })

    assert.equal(r.veredito, 'recusada')
    assert.equal(r.bloqueadoPeloTeto, true)
    assert.equal(listar(lerLog(caminho)).length, 0)

    // A recusa é do teto, não de quem aprovou — e o log diz isso.
    const decisao = lerLog(caminho).find((x) => x.acao === 'pendencia.decidida')
    assert.match(decisao.dados.motivo, /bloqueado pelo teto/)
  })
})

test('reembolso dentro dos tetos é aprovado', async () => {
  const { enfileirar, decidir } = await import('./pendencias.mjs')
  const { lerLog } = await import('./log.mjs')
  comLogTemporario((caminho) => {
    const id = enfileirar({ alvo: 'reembolso', dados: { valor: 90 } }, caminho)
    const r = decidir(id, 'aprovada', 'kaua', { registros: lerLog(caminho), config: CHEIA, caminho })
    assert.equal(r.veredito, 'aprovada')
  })
})

test('esperando mostra há quanto tempo cada pendência aguarda', async () => {
  const { enfileirar, esperando } = await import('./pendencias.mjs')
  const { lerLog } = await import('./log.mjs')
  comLogTemporario((caminho) => {
    enfileirar({ alvo: 'reembolso', dados: { valor: 50 } }, caminho)
    const fila = esperando(new Date(Date.now() + 90 * 60000), lerLog(caminho))
    assert.equal(fila.length, 1)
    assert.ok(fila[0].minutosEsperando >= 89, `esperou ${fila[0].minutosEsperando} min`)
  })
})

// ---------------------------------------------------------------------------
// Orçamento de anúncios
// ---------------------------------------------------------------------------

const gastoAds = (valor, minutosAtras) => ({
  acao: 'ads.gasto',
  em: new Date(Date.now() - minutosAtras * 60000).toISOString(),
  dados: { valor },
})

test('sem config, nenhum gasto em anúncio passa', () => {
  const r = avaliarAds(10, { config: { dinheiro: { moeda: '____' } }, registros: [] })
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /trava/)
})

test('o teto do dia de anúncios barra o acumulado', () => {
  // O buraco que existia: config preenchida deixava `anuncios` liberada e nada
  // somava gasto nenhum.
  const registros = [gastoAds(40, 120), gastoAds(15, 60)]
  const r = avaliarAds(10, { config: CHEIA, registros })
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /teto do dia/)
  assert.equal(r.gastos.dia, 55)
})

test('o orçamento do mês barra mesmo com o dia limpo', () => {
  // Instantes fixos, não "N dias atrás": num dia 3, "5 dias atrás" cai no mês
  // anterior e o teste passa a testar outra coisa — que foi exatamente o que
  // aconteceu na primeira versão disto.
  const agora = new Date('2026-09-20T15:00:00Z')
  const registros = [{ acao: 'ads.gasto', em: '2026-09-15T13:00:00Z', dados: { valor: 880 } }]
  const r = avaliarAds(50, { config: CHEIA, registros, agora })
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /mês/)
  assert.equal(r.gastos.mes, 880)
  assert.equal(r.gastos.dia, 0)
})

test('gasto do mês passado não conta no mês atual', () => {
  const agora = new Date('2026-09-03T15:00:00Z')
  const registros = [{ acao: 'ads.gasto', em: '2026-08-29T13:00:00Z', dados: { valor: 880 } }]
  const r = avaliarAds(50, { config: CHEIA, registros, agora })
  assert.equal(r.permitido, true)
  assert.equal(r.gastos.mes, 0)
})

test('gasto em anúncio dentro dos tetos passa, com aviso aos 80%', () => {
  const r = avaliarAds(10, { config: CHEIA, registros: [gastoAds(40, 30)] })
  assert.equal(r.permitido, true)
  assert.ok(r.avisos.some((a) => /teto do dia/.test(a)), JSON.stringify(r.avisos))
})

test('só ads.gasto entra na conta de anúncios', () => {
  const registros = [
    { acao: 'ads.avaliado', em: new Date().toISOString(), dados: { valor: 500 } },
    gastoAds(20, 10),
  ]
  assert.equal(gastoEmAds(new Date(), CHEIA, registros).dia, 20)
})

test('valor inválido de anúncio é recusado', () => {
  for (const v of [0, -5, NaN, undefined]) {
    assert.equal(avaliarAds(v, { config: CHEIA, registros: [] }).permitido, false)
  }
})

// ---------------------------------------------------------------------------
// Rampa de conteúdo
// ---------------------------------------------------------------------------

const lote = (acao) => ({ acao, em: new Date().toISOString(), dados: {} })

test('a contagem de lotes é derivada do log, não digitada', () => {
  const registros = ['conteudo.lote_aprovado', 'conteudo.lote_aprovado', 'conteudo.lote_aprovado'].map(lote)
  assert.equal(lotesLimposSeguidos(registros), 3)
})

test('um lote alterado zera a contagem', () => {
  // "Seguidos" é o ponto: cinco aprovações com uma correção no meio não são
  // cinco lotes limpos.
  const registros = [
    lote('conteudo.lote_aprovado'),
    lote('conteudo.lote_aprovado'),
    lote('conteudo.lote_alterado'),
    lote('conteudo.lote_aprovado'),
  ]
  assert.equal(lotesLimposSeguidos(registros), 1)
})

test('ações não relacionadas não interrompem nem contam', () => {
  const registros = [
    lote('conteudo.lote_aprovado'),
    { acao: 'email.triagem', em: new Date().toISOString() },
    lote('conteudo.lote_aprovado'),
  ]
  assert.equal(lotesLimposSeguidos(registros), 2)
})

test('a rampa fecha só no número exigido', () => {
  const quatro = Array.from({ length: 4 }, () => lote('conteudo.lote_aprovado'))
  assert.equal(estadoDaRampa(CHEIA, quatro).fechada, false)
  assert.equal(estadoDaRampa(CHEIA, [...quatro, lote('conteudo.lote_aprovado')]).fechada, true)
})

test('log vazio significa zero lotes, não rampa fechada por acidente', () => {
  assert.equal(lotesLimposSeguidos([]), 0)
  assert.equal(estadoDaRampa(CHEIA, []).fechada, false)
})
