// ---------------------------------------------------------------------------
// Tipos centrais do Ápice
// ---------------------------------------------------------------------------

export type Sexo = 'M' | 'F'

export type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta'

export type Objetivo = 'cutting' | 'manutencao' | 'bulking' | 'recomposicao'

export interface Perfil {
  nome: string
  sexo: Sexo
  nascimento: string // YYYY-MM-DD
  alturaCm: number
  pesoKg: number
  gorduraPct?: number
  atividade: NivelAtividade
  objetivo: Objetivo
  /** Ajuste manual sobre o TDEE calculado, em kcal (ex.: -300, +250). */
  ajusteKcal: number
  /** g de proteína por kg de peso corporal. */
  proteinaPorKg: number
  /** g de gordura por kg de peso corporal. */
  gorduraPorKg: number
  /** Sobrescreve as metas calculadas quando definido. */
  metasManuais?: Metas | null
  /**
   * Se a altura entra na comparação de força. Ausente conta como ligado; é um
   * modelo mecânico, não dado de população, então dá para desligar.
   */
  ajustarPorAltura?: boolean
}

export interface Metas {
  kcal: number
  proteina: number
  carbo: number
  gordura: number
  fibra: number
  agua: number // ml
}

// --------------------------------- Nutrição --------------------------------

export interface Macros {
  kcal: number
  proteina: number
  carbo: number
  gordura: number
  fibra: number
  sodio?: number // mg
  acucar?: number // g
}

export interface ItemAlimento extends Macros {
  id: string
  nome: string
  /** Quantidade estimada, em gramas ou ml. */
  quantidade: number
  unidade: 'g' | 'ml' | 'un'
  /** Descrição da porção reconhecida, ex.: "1 concha média". */
  porcaoDescrita?: string
  /** 0–1, confiança da estimativa visual. */
  confianca?: number
}

// ------------------------- Produto embalado (código de barras) -------------

/** Nutrientes por 100 g ou 100 ml. `null` significa "não informado", nunca zero. */
export interface NutrientesPor100 {
  kcal: number | null
  proteina: number | null
  carbo: number | null
  gordura: number | null
  gorduraSaturada: number | null
  fibra: number | null
  acucar: number | null
  /** Em mg. */
  sodio: number | null
}

export interface Produto {
  /** EAN-13, EAN-8 ou UPC-A, como impresso na embalagem. */
  codigo: string
  nome: string
  marca?: string
  /** Conteúdo da embalagem, ex.: "395 g". */
  embalagem?: string
  /** Porção declarada pelo fabricante, em g ou ml. */
  porcaoG?: number
  porcaoDescrita?: string
  liquido: boolean
  por100: NutrientesPor100
  ingredientes?: string
  /** Grupo NOVA, 1 a 4. */
  nova?: number
  /** Códigos INS dos aditivos declarados. */
  aditivos: string[]
  imagemUrl?: string
  /** Quando o registro foi atualizado pela última vez na base. */
  atualizadoEm?: string
  /** Endereço da ficha, para o usuário conferir ou corrigir. */
  fonteUrl: string
}

export interface MarcadorAlto {
  nutriente: 'Açúcar' | 'Gordura saturada' | 'Sódio'
  valor: number
  limite: number
  unidade: string
  /**
   * `provavel` quando o dado disponível não é exatamente o que a norma mede —
   * hoje só acontece com açúcar (total na base, adicionado na norma).
   */
  certeza: 'confirmado' | 'provavel'
  nota?: string
}

export interface AvaliacaoProduto {
  altos: MarcadorAlto[]
  positivos: string[]
  /** Nutrientes que a base não informou — ficam fora do julgamento. */
  semDados: string[]
  observacoes: string[]
  /** "100 g" ou "100 ml". */
  unidadeBase: string
}

export type TipoRefeicao = 'cafe' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia' | 'pre' | 'pos'

export interface Refeicao {
  id: string
  data: string // YYYY-MM-DD
  hora: string // HH:MM
  tipo: TipoRefeicao
  titulo: string
  itens: ItemAlimento[]
  fotoDataUrl?: string
  /**
   * De onde vieram os números. Aparece na tela porque a confiabilidade de cada
   * origem é diferente: rótulo lido por código de barras é declaração do
   * fabricante; foto é estimativa.
   */
  origem: 'foto' | 'tabela' | 'manual' | 'codigo-barras'
  /** Código de barras, quando a refeição veio de um produto embalado. */
  codigoBarras?: string
  observacoes?: string
  recomendacao?: string
}

export interface AnaliseFoto {
  titulo: string
  itens: Omit<ItemAlimento, 'id'>[]
  confiancaGeral: number
  recomendacao: string
  alertas: string[]
  observacoes?: string
}

export interface AlimentoTabela extends Macros {
  id: string
  nome: string
  categoria: string
  /** Porção caseira de referência, em gramas. */
  porcaoCaseira?: { descricao: string; gramas: number }
}

// ---------------------------------- Treino ---------------------------------

export type Equipamento =
  | 'barra'
  | 'halter'
  | 'polia'
  | 'maquina'
  | 'smith'
  | 'peso-corporal'
  | 'kettlebell'
  | 'elastico'
  | 'cardio'

export type GrupoMuscular =
  | 'Peito'
  | 'Costas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Antebraço'
  | 'Trapézio'
  | 'Quadríceps'
  | 'Posterior'
  | 'Glúteos'
  | 'Panturrilha'
  | 'Abdômen'
  | 'Lombar'
  | 'Corpo inteiro'
  | 'Cardio'

/** Lifts com tabela própria de padrões de força. */
export type LiftReferencia =
  | 'supino'
  | 'agachamento'
  | 'terra'
  | 'desenvolvimento'
  | 'remada'
  | 'barra-fixa'
  | 'paralelas'

export interface Exercicio {
  id: string
  nome: string
  equipamento: Equipamento
  grupo: GrupoMuscular
  secundarios: GrupoMuscular[]
  tipo: 'composto' | 'isolado' | 'cardio'
  /** Carga aplicada em cada lado/membro separadamente (halteres, unilaterais). */
  unilateral?: boolean
  /** O peso corporal entra na carga total (barra fixa, paralelas, flexão). */
  usaPesoCorporal?: boolean
  /** Fração do peso corporal que efetivamente atua no movimento. */
  fracaoCorporal?: number
  /** Mapeamento para a tabela de padrões: lift base × coeficiente. */
  ref?: { lift: LiftReferencia; coef: number }
  dica?: string
}

export interface Serie {
  id: string
  reps: number
  /** Carga externa em kg (por halter, quando unilateral). */
  peso: number
  rpe?: number
  /** Série de aquecimento não conta para volume nem para PR. */
  aquecimento?: boolean
  /** 1RM estimado no momento do registro (kg de sistema). */
  e1rm?: number
  concluida: boolean
}

export interface ExercicioSessao {
  id: string
  exercicioId: string
  series: Serie[]
  notas?: string
}

export interface Treino {
  id: string
  data: string // YYYY-MM-DD
  inicio: string // ISO
  fim?: string // ISO
  nome: string
  exercicios: ExercicioSessao[]
  observacoes?: string
}

// -------------------------- Força / classificação --------------------------

export type NivelForca = 'Iniciante' | 'Novato' | 'Intermediário' | 'Avançado' | 'Elite'

export interface ClassificacaoForca {
  e1rm: number
  /** Carga total do sistema considerada (inclui peso corporal quando aplicável). */
  cargaSistema: number
  nivel: NivelForca
  /** Percentil estimado na população treinada (0–100). */
  percentil: number
  /** Razão entre o e1RM e a mediana mundial (nível intermediário). */
  vsMedia: number
  /** Múltiplo do peso corporal. */
  vsPeso: number
  limiares: Record<NivelForca, number>
  /** Carga que falta para o próximo nível. */
  proximoNivel?: { nivel: NivelForca; faltamKg: number }
  /** true quando os padrões vêm de um lift de referência com coeficiente. */
  estimado: boolean
  /** O que entrou na comparação, para a tela poder mostrar de onde saiu o número. */
  ajustes: {
    /** Multiplicador aplicado aos limiares pela idade. */
    idade: number
    /** Multiplicador aplicado aos limiares pela altura (1 quando desligado). */
    altura: number
    /** Altura típica de quem treina neste peso corporal, em cm. */
    alturaReferenciaCm: number
  }
}

export interface RecordePessoal {
  exercicioId: string
  e1rm: number
  peso: number
  reps: number
  data: string
  percentil: number
}

// ------------------------------ Gamificação --------------------------------

export interface Conquista {
  id: string
  nome: string
  descricao: string
  icone: string
  tier: 'bronze' | 'prata' | 'ouro' | 'platina' | 'diamante'
  desbloqueadaEm?: string
}

export interface EstadoJogo {
  xp: number
  conquistas: Record<string, string> // id -> data ISO de desbloqueio
  ultimoDiaAtivo?: string
  streakAtual: number
  streakRecorde: number
}

// -------------------------------- Coach IA ---------------------------------

export interface MensagemCoach {
  id: string
  papel: 'user' | 'assistant'
  texto: string
  em: string
}
