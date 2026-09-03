/**
 * Leitura e validação da configuração do JARVIS.
 *
 * A trava de configuração é o coração do sistema: enquanto faltar um valor, o
 * assistente não pode mover dinheiro nem publicar. Ela mora aqui, em código,
 * porque uma trava escrita só no prompt depende do modelo lembrar dela — e a
 * hora em que ele mais precisa lembrar é justamente a hora em que alguém está
 * pedindo com urgência para abrir uma exceção.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)))
export const CAMINHO_CONFIG = join(RAIZ, 'config', 'jarvis.config.json')
export const CAMINHO_LOG = join(RAIZ, 'log', 'acoes.jsonl')

/** Um valor conta como preenchido? `____`, vazio, null e zero-por-omissão não contam. */
function preenchido(valor) {
  if (valor === null || valor === undefined) return false
  if (typeof valor === 'string') return valor.trim() !== '' && !valor.includes('____')
  if (typeof valor === 'number') return Number.isFinite(valor) && valor > 0
  if (Array.isArray(valor)) return valor.length > 0
  return true
}

/**
 * Campos que precisam existir para cada capacidade ser liberada.
 *
 * A granularidade importa: quem preencheu os limites de reembolso mas não
 * definiu a janela de silêncio deveria poder reembolsar sem poder ligar de
 * madrugada. Uma trava única para tudo faria o usuário preencher qualquer coisa
 * só para destravar o resto — que é como limites viram ficção.
 */
const EXIGENCIAS = {
  reembolso: [
    'dinheiro.moeda',
    'dinheiro.reembolso_max_por_pedido',
    'dinheiro.reembolso_max_acumulado_dia',
    'dinheiro.reembolso_max_acumulado_semana',
  ],
  anuncios: ['dinheiro.moeda', 'dinheiro.ads_orcamento_mes', 'dinheiro.ads_gasto_max_dia'],
  escalonamento: [
    'escalonamento.fuso_horario_utc_offset',
    'escalonamento.janela_silencio.de',
    'escalonamento.janela_silencio.ate',
    'escalonamento.email_escalonamento',
    'escalonamento.exemplos_p1',
    'escalonamento.exemplos_p2',
  ],
  ligacao: ['escalonamento.telefone_emergencia'],
}

const buscar = (obj, caminho) => caminho.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

export function lerConfig(caminho = CAMINHO_CONFIG) {
  return JSON.parse(readFileSync(caminho, 'utf8'))
}

/**
 * O estado da trava, por capacidade.
 *
 * `somenteLeitura` é verdadeiro enquanto qualquer capacidade que mexe no mundo
 * estiver bloqueada — é o modo que o prompt manda anunciar na primeira linha.
 */
export function estadoDaTrava(config = lerConfig(), { lotesLimpos = 0 } = {}) {
  const capacidades = {}
  for (const [nome, campos] of Object.entries(EXIGENCIAS)) {
    const faltando = campos.filter((c) => !preenchido(buscar(config, c)))
    capacidades[nome] = { liberada: faltando.length === 0, faltando }
  }

  // A contagem de lotes NÃO vem do arquivo de configuração. Ela é derivada do
  // log por `conteudo.mjs` e chega aqui pronta — um número que ninguém pode
  // digitar é um número que ninguém digita errado.
  const necessarios = config?.conteudo?.lotes_necessarios ?? 5
  const publicacao = config?.conteudo?.publicacao_automatica_liberada === true && lotesLimpos >= necessarios

  capacidades.publicacao = {
    liberada: publicacao,
    faltando: publicacao ? [] : [`lotes aprovados sem alteração (${lotesLimpos}/${necessarios})`],
  }

  const todasFaltas = Object.values(capacidades).flatMap((c) => c.faltando)

  return {
    capacidades,
    faltando: todasFaltas,
    // Reembolso e anúncios são o que caracteriza "mexer no dinheiro". Sem os
    // dois, não existe autonomia financeira nenhuma — é modo somente-leitura.
    somenteLeitura: !capacidades.reembolso.liberada && !capacidades.anuncios.liberada,
  }
}

/** Offset em minutos do fuso configurado; -180 (Brasília) quando não definido. */
export function offsetMinutos(config = lerConfig()) {
  const h = config?.escalonamento?.fuso_horario_utc_offset
  return typeof h === 'number' ? Math.round(h * 60) : -180
}
