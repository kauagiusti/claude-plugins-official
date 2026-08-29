import { RICOS_EM_FIBRA, RICOS_EM_PROTEINA } from '../data/alimentos'
import type { AlimentoTabela, ItemAlimento, Macros, Metas, Perfil, Refeicao, TipoRefeicao } from '../types'
import { idadeDe } from './forca'

const FATOR_ATIVIDADE = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  atleta: 1.9,
} as const

export const ROTULO_ATIVIDADE: Record<keyof typeof FATOR_ATIVIDADE, string> = {
  sedentario: 'Sedentário — trabalho parado, sem treino',
  leve: 'Leve — treino 1 a 3× por semana',
  moderado: 'Moderado — treino 3 a 5× por semana',
  intenso: 'Intenso — treino 6 a 7× por semana',
  atleta: 'Atleta — dois treinos por dia ou trabalho físico',
}

export const ROTULO_OBJETIVO = {
  cutting: 'Perder gordura',
  manutencao: 'Manter peso',
  bulking: 'Ganhar massa',
  recomposicao: 'Recomposição corporal',
} as const

const AJUSTE_OBJETIVO = {
  cutting: -0.2,
  manutencao: 0,
  bulking: 0.12,
  recomposicao: -0.08,
} as const

export const ROTULO_REFEICAO: Record<TipoRefeicao, string> = {
  cafe: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
  pre: 'Pré-treino',
  pos: 'Pós-treino',
}

/** Taxa metabólica basal. Usa Katch-McArdle quando há % de gordura conhecido. */
export function tmb(perfil: Perfil): number {
  const idade = idadeDe(perfil.nascimento)
  if (perfil.gorduraPct && perfil.gorduraPct > 3 && perfil.gorduraPct < 60) {
    const massaMagra = perfil.pesoKg * (1 - perfil.gorduraPct / 100)
    return 370 + 21.6 * massaMagra
  }
  // Mifflin-St Jeor
  const base = 10 * perfil.pesoKg + 6.25 * perfil.alturaCm - 5 * idade
  return perfil.sexo === 'M' ? base + 5 : base - 161
}

export function tdee(perfil: Perfil): number {
  return tmb(perfil) * FATOR_ATIVIDADE[perfil.atividade]
}

export function calcularMetas(perfil: Perfil): Metas {
  if (perfil.metasManuais) return perfil.metasManuais

  const manutencao = tdee(perfil)
  const kcal = Math.round(manutencao * (1 + AJUSTE_OBJETIVO[perfil.objetivo]) + perfil.ajusteKcal)

  const proteina = Math.round(perfil.proteinaPorKg * perfil.pesoKg)
  const gordura = Math.round(perfil.gorduraPorKg * perfil.pesoKg)
  const kcalRestante = kcal - proteina * 4 - gordura * 9
  const carbo = Math.max(30, Math.round(kcalRestante / 4))

  return {
    kcal: Math.max(1000, kcal),
    proteina,
    carbo,
    gordura,
    fibra: Math.round((kcal / 1000) * 14),
    agua: Math.round(perfil.pesoKg * 35),
  }
}

export const MACROS_ZERO: Macros = { kcal: 0, proteina: 0, carbo: 0, gordura: 0, fibra: 0, sodio: 0, acucar: 0 }

export function somarMacros(itens: Macros[]): Macros {
  return itens.reduce<Macros>(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal || 0),
      proteina: acc.proteina + (m.proteina || 0),
      carbo: acc.carbo + (m.carbo || 0),
      gordura: acc.gordura + (m.gordura || 0),
      fibra: acc.fibra + (m.fibra || 0),
      sodio: (acc.sodio || 0) + (m.sodio || 0),
      acucar: (acc.acucar || 0) + (m.acucar || 0),
    }),
    { ...MACROS_ZERO },
  )
}

export function totaisRefeicao(r: Refeicao): Macros {
  return somarMacros(r.itens)
}

export function totaisDoDia(refeicoes: Refeicao[]): Macros {
  return somarMacros(refeicoes.map(totaisRefeicao))
}

/** Converte um alimento da tabela (valores por 100 g) numa quantidade específica. */
export function porcaoDe(alimento: AlimentoTabela, gramas: number): Omit<ItemAlimento, 'id'> {
  const k = gramas / 100
  return {
    nome: alimento.nome,
    quantidade: gramas,
    unidade: 'g',
    kcal: Math.round(alimento.kcal * k),
    proteina: +(alimento.proteina * k).toFixed(1),
    carbo: +(alimento.carbo * k).toFixed(1),
    gordura: +(alimento.gordura * k).toFixed(1),
    fibra: +(alimento.fibra * k).toFixed(1),
    sodio: alimento.sodio ? Math.round(alimento.sodio * k) : undefined,
  }
}

export interface Restante {
  kcal: number
  proteina: number
  carbo: number
  gordura: number
  fibra: number
}

export function restante(consumido: Macros, metas: Metas): Restante {
  return {
    kcal: metas.kcal - consumido.kcal,
    proteina: metas.proteina - consumido.proteina,
    carbo: metas.carbo - consumido.carbo,
    gordura: metas.gordura - consumido.gordura,
    fibra: metas.fibra - consumido.fibra,
  }
}

export function percentual(valor: number, meta: number): number {
  if (meta <= 0) return 0
  return Math.min(999, (valor / meta) * 100)
}

// ------------------------- Recomendações locais ----------------------------

export interface Recomendacao {
  titulo: string
  texto: string
  tom: 'ok' | 'atencao' | 'alerta'
  sugestoes: { nome: string; quantidade: string; ganho: string }[]
}

function refeicoesRestantesHoje(hora: number): number {
  if (hora < 9) return 4
  if (hora < 12) return 3
  if (hora < 16) return 2
  if (hora < 20) return 1
  return 0
}

/**
 * Escolhe uma das redações possíveis para o conselho.
 *
 * O conteúdo é sempre o mesmo — o que muda é como está dito. Um app que repete
 * a mesma frase todo dia deixa de ser lido no terceiro dia, e aí o conselho não
 * chega nem quando importa.
 */
function variar(opcoes: string[], agora: Date): string {
  // Varia por dia e por período, não a cada renderização: texto que muda
  // sozinho enquanto se lê é pior que texto repetido.
  const indice = (agora.getDate() * 4 + Math.floor(agora.getHours() / 6)) % opcoes.length
  return opcoes[indice]
}

/**
 * Motor local de recomendação — roda sem depender da IA, para o app continuar
 * útil offline ou sem chave de API configurada.
 */
export function recomendacaoLocal(consumido: Macros, metas: Metas, agora = new Date()): Recomendacao {
  const r = restante(consumido, metas)
  const hora = agora.getHours()
  const faltam = refeicoesRestantesHoje(hora)
  const sugestoes: Recomendacao['sugestoes'] = []

  // Proteína é a prioridade: é o macro que mais sofre quando o dia aperta.
  if (r.proteina > 15) {
    for (const a of RICOS_EM_PROTEINA.slice(0, 3)) {
      const gramas = Math.min(200, Math.max(30, Math.round((r.proteina / a.proteina) * 100)))
      sugestoes.push({
        nome: a.nome,
        quantidade: `${gramas} g`,
        ganho: `+${Math.round((a.proteina * gramas) / 100)} g proteína · ${Math.round((a.kcal * gramas) / 100)} kcal`,
      })
    }
  } else if (r.fibra > 8) {
    for (const a of RICOS_EM_FIBRA.slice(0, 3)) {
      const gramas = a.categoria === 'Gorduras' ? 20 : 100
      sugestoes.push({
        nome: a.nome,
        quantidade: `${gramas} g`,
        ganho: `+${((a.fibra * gramas) / 100).toFixed(1)} g fibra`,
      })
    }
  }

  let titulo: string
  let texto: string
  let tom: Recomendacao['tom'] = 'ok'

  if (r.kcal < -150) {
    tom = 'alerta'
    titulo = `${Math.abs(Math.round(r.kcal))} kcal acima da meta`
    texto =
      faltam > 0
        ? variar(
            [
              'Você já passou da meta e ainda faltam refeições no dia. Segure o resto em proteína magra e vegetais — ou compense com uma caminhada de 30 a 40 minutos.',
              'Passou da meta com o dia em aberto. Daqui para a frente, prato de proteína e vegetal: enche sem somar muito.',
              'A meta já foi. Não precisa pular refeição — precisa que as próximas sejam leves e proteicas.',
              'Acima do alvo e ainda há refeições pela frente. Uma caminhada de meia hora devolve boa parte disso.',
            ],
            agora,
          )
        : variar(
            [
              'Dia fechado acima da meta. Um dia isolado não desfaz a semana: retome amanhã no mesmo ritmo, sem cortar demais para compensar.',
              'Fechou acima. O que decide resultado é a média da semana, não a linha de hoje — amanhã segue igual.',
              'Dia acima da meta, e tudo bem. Compensar cortando demais amanhã costuma sair pior que o próprio excesso.',
            ],
            agora,
          )
  } else if (r.proteina > 40 && faltam <= 1) {
    tom = 'alerta'
    titulo = `Faltam ${Math.round(r.proteina)} g de proteína`
    texto =
      r.kcal > 600
        ? `Resta pouca refeição no dia para uma diferença grande de proteína — mas ainda há ${Math.round(r.kcal)} kcal de espaço. Faça uma refeição completa em torno de uma fonte concentrada: carne magra, ovos, iogurte grego ou whey.`
        : `Resta pouca refeição no dia e pouco espaço calórico. Priorize proteína pura agora — whey, clara de ovo ou iogurte grego entregam bastante proteína por caloria.`
  } else if (r.proteina > 25) {
    tom = 'atencao'
    titulo = `Faltam ${Math.round(r.proteina)} g de proteína`
    texto = variar(
      [
        `Você tem ${Math.round(r.kcal)} kcal de espaço. Priorize proteína nas próximas ${faltam || 1} refeições — é o macro que mais protege a massa magra.`,
        `Sobram ${Math.round(r.kcal)} kcal. Se cada refeição daqui até o fim do dia levar uma fonte de proteína, a conta fecha sozinha.`,
        `Ainda cabem ${Math.round(r.kcal)} kcal no dia. Comece o prato pela proteína e monte o resto em volta dela.`,
        `Falta proteína e ainda há ${Math.round(r.kcal)} kcal disponíveis — dá para resolver sem apertar em nada.`,
      ],
      agora,
    )
  } else if (r.kcal > metas.kcal * 0.45 && hora >= 18) {
    tom = 'atencao'
    titulo = `Ainda faltam ${Math.round(r.kcal)} kcal`
    texto = variar(
      [
        'Está bem abaixo da meta para o horário. Comer pouco demais derruba treino e recuperação — inclua uma refeição completa antes de dormir.',
        'Faltou bastante comida para a hora que é. Déficit grande demais cobra no treino de amanhã, não hoje.',
        'O dia está muito abaixo do alvo. Vale um jantar completo em vez de um lanche: proteína, carboidrato e vegetal.',
      ],
      agora,
    )
  } else if (r.fibra > 10) {
    tom = 'atencao'
    titulo = `Fibra baixa: faltam ${Math.round(r.fibra)} g`
    texto = variar(
      [
        'Macros bem encaminhados, mas a fibra está atrasada. Vegetais, feijão e frutas resolvem sem peso calórico relevante.',
        'Os macros estão no lugar; a fibra não. Uma concha de feijão e uma fruta já cobrem a diferença.',
        'Falta fibra, e ela quase não custa caloria: salada, legume cozido ou uma fruta com casca.',
      ],
      agora,
    )
  } else {
    titulo = variar(['Dia no rumo certo', 'Tudo encaminhado', 'Nada a corrigir por enquanto', 'No ritmo'], agora)
    texto = variar(
      [
        `Restam ${Math.round(r.kcal)} kcal, ${Math.round(r.proteina)} g de proteína e ${Math.round(r.carbo)} g de carbo. Mantenha o padrão nas próximas refeições.`,
        `Ainda cabem ${Math.round(r.kcal)} kcal e ${Math.round(r.proteina)} g de proteína. Do jeito que está, o dia fecha bem.`,
        `Faltam ${Math.round(r.proteina)} g de proteína dentro de ${Math.round(r.kcal)} kcal — é folga suficiente para comer o que você quiser comer.`,
      ],
      agora,
    )
  }

  return { titulo, texto, tom, sugestoes: sugestoes.slice(0, 3) }
}

/** Alertas objetivos sobre uma refeição recém-registrada. */
export function alertasRefeicao(m: Macros): string[] {
  const alertas: string[] = []
  if ((m.sodio ?? 0) > 1200) alertas.push(`Sódio alto nesta refeição (~${Math.round(m.sodio!)} mg).`)
  if (m.kcal > 900) alertas.push(`Refeição densa: ${Math.round(m.kcal)} kcal de uma vez.`)
  if (m.gordura > 45) alertas.push(`${Math.round(m.gordura)} g de gordura — acima do usual para uma refeição.`)
  if (m.kcal > 250 && m.proteina < 8) alertas.push('Quase sem proteína: considere adicionar uma fonte.')
  return alertas
}

export function tipoRefeicaoPorHora(hora = new Date().getHours()): TipoRefeicao {
  if (hora < 10) return 'cafe'
  if (hora < 12) return 'lanche_manha'
  if (hora < 15) return 'almoco'
  if (hora < 18) return 'lanche_tarde'
  if (hora < 22) return 'jantar'
  return 'ceia'
}
