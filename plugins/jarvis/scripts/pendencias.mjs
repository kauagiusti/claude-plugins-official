/**
 * Fila de aprovação das ações de Nível 3.
 *
 * A fila é DERIVADA DO LOG, não guardada num arquivo próprio. Duas razões:
 * um segundo arquivo mutável seria mais um lugar para o estado divergir, e a
 * fila num arquivo comum poderia ser esvaziada sem deixar rastro — enquanto o
 * log tem cadeia de hash e denuncia remoção.
 *
 * Uma pendência é, então, um `pendencia.criada` sem o `pendencia.decidida`
 * correspondente. O histórico completo de quem aprovou o quê, e quando, sai da
 * mesma leitura.
 */
import { randomUUID } from 'node:crypto'
import { lerConfig } from './config.mjs'
import { lerLog, registrar } from './log.mjs'
import { avaliarReembolso } from './limites.mjs'

/** Enfileira uma ação que exige confirmação. Devolve o id curto. */
export function enfileirar({ alvo, dados, prioridade = 'P2' }, caminho) {
  if (!alvo) throw new Error('enfileirar() exige `alvo` — o que se pretende fazer')
  const id = randomUUID().slice(0, 8)
  registrar({ acao: 'pendencia.criada', modo: 'autonoma', dados: { id, alvo, prioridade, ...dados } }, caminho)
  return id
}

/** Pendências abertas, mais antigas primeiro. */
export function listar(registros = lerLog()) {
  const criadas = new Map()
  const decididas = new Set()

  for (const r of registros) {
    if (r.acao === 'pendencia.criada' && r.dados?.id) {
      criadas.set(r.dados.id, { ...r.dados, criadaEm: r.em })
    }
    if (r.acao === 'pendencia.decidida' && r.dados?.id) {
      decididas.add(r.dados.id)
    }
  }

  return [...criadas.values()]
    .filter((p) => !decididas.has(p.id))
    .sort((a, b) => Date.parse(a.criadaEm) - Date.parse(b.criadaEm))
}

/**
 * Registra a decisão de uma pendência.
 *
 * Reembolso é reavaliado NA HORA DA APROVAÇÃO, não na hora do pedido. Entre
 * enfileirar e aprovar pode ter passado meio dia e podem ter saído outros
 * reembolsos — aprovar com a conta velha é como o teto acumulado deixa de
 * valer sem ninguém mexer nele.
 */
export function decidir(
  id,
  veredito,
  por,
  { motivo, registros = lerLog(), config = lerConfig(), agora = new Date(), caminho } = {},
) {
  if (!['aprovada', 'recusada'].includes(veredito)) {
    throw new Error("veredito precisa ser 'aprovada' ou 'recusada'")
  }
  if (!por) throw new Error('decidir() exige quem decidiu')

  const pendencia = listar(registros).find((p) => p.id === id)
  if (!pendencia) throw new Error(`pendência ${id} não está aberta`)

  if (veredito === 'aprovada' && pendencia.alvo === 'reembolso') {
    const cabe = avaliarReembolso(Number(pendencia.valor), { agora, config, registros })
    if (!cabe.permitido) {
      // A recusa aqui não é do usuário — é do teto. Fica registrada como tal,
      // para não parecer que alguém mudou de ideia.
      registrar(
        {
          acao: 'pendencia.decidida',
          modo: 'confirmada',
          confirmadoPor: por,
          dados: { id, veredito: 'recusada', motivo: `bloqueado pelo teto: ${cabe.motivo}`, alvo: pendencia.alvo },
        },
        caminho,
      )
      return { veredito: 'recusada', motivo: cabe.motivo, bloqueadoPeloTeto: true }
    }
  }

  registrar(
    {
      acao: 'pendencia.decidida',
      modo: 'confirmada',
      confirmadoPor: por,
      dados: { id, veredito, alvo: pendencia.alvo, ...(motivo ? { motivo } : {}) },
    },
    caminho,
  )
  return { veredito, pendencia }
}

/** Quanto tempo cada pendência está esperando, em minutos. */
export function esperando(agora = new Date(), registros = lerLog()) {
  return listar(registros).map((p) => ({
    ...p,
    minutosEsperando: Math.floor((agora.getTime() - Date.parse(p.criadaEm)) / 60000),
  }))
}
