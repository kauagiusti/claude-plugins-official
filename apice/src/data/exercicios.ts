import type { Equipamento, Exercicio, GrupoMuscular, LiftReferencia } from '../types'

// ---------------------------------------------------------------------------
// Base de exercícios.
//
// `ref` liga o exercício a um dos 7 lifts com tabela própria de padrões de
// força (src/data/padroesForca.ts). `coef` é a razão entre o 1RM esperado
// neste exercício e o 1RM no lift de referência — ex.: supino inclinado com
// coef 0.82 significa que 82 kg no inclinado equivalem a ~100 kg no reto.
// Exercícios sem `ref` são registrados normalmente (volume, PR pessoal,
// progressão), mas não recebem percentil mundial.
// ---------------------------------------------------------------------------

type Opts = {
  unilateral?: boolean
  usaPesoCorporal?: boolean
  fracaoCorporal?: number
  ref?: [LiftReferencia, number]
  dica?: string
}

function x(
  id: string,
  nome: string,
  equipamento: Equipamento,
  grupo: GrupoMuscular,
  secundarios: GrupoMuscular[],
  tipo: 'composto' | 'isolado' | 'cardio',
  o: Opts = {},
): Exercicio {
  return {
    id,
    nome,
    equipamento,
    grupo,
    secundarios,
    tipo,
    unilateral: o.unilateral,
    usaPesoCorporal: o.usaPesoCorporal,
    fracaoCorporal: o.fracaoCorporal,
    ref: o.ref ? { lift: o.ref[0], coef: o.ref[1] } : undefined,
    dica: o.dica,
  }
}

// --------------------------------- PEITO -----------------------------------

const peito: Exercicio[] = [
  x('supino-reto-barra', 'Supino reto com barra', 'barra', 'Peito', ['Tríceps', 'Ombros'], 'composto', {
    ref: ['supino', 1.0],
    dica: 'Escápulas retraídas, pés firmes no chão, barra descendo na linha do mamilo.',
  }),
  x('supino-inclinado-barra', 'Supino inclinado com barra', 'barra', 'Peito', ['Ombros', 'Tríceps'], 'composto', {
    ref: ['supino', 0.82],
    dica: 'Banco entre 30° e 45°. Acima disso o ombro assume o trabalho.',
  }),
  x('supino-declinado-barra', 'Supino declinado com barra', 'barra', 'Peito', ['Tríceps'], 'composto', {
    ref: ['supino', 1.05],
  }),
  x('supino-fechado', 'Supino fechado (pegada fechada)', 'barra', 'Tríceps', ['Peito', 'Ombros'], 'composto', {
    ref: ['supino', 0.85],
    dica: 'Pegada na largura dos ombros — mais estreito que isso castiga o punho.',
  }),
  x('supino-reto-halter', 'Supino reto com halteres', 'halter', 'Peito', ['Tríceps', 'Ombros'], 'composto', {
    unilateral: true,
    ref: ['supino', 0.88],
  }),
  x('supino-inclinado-halter', 'Supino inclinado com halteres', 'halter', 'Peito', ['Ombros', 'Tríceps'], 'composto', {
    unilateral: true,
    ref: ['supino', 0.72],
  }),
  x('supino-declinado-halter', 'Supino declinado com halteres', 'halter', 'Peito', ['Tríceps'], 'composto', {
    unilateral: true,
    ref: ['supino', 0.92],
  }),
  x('supino-smith', 'Supino reto no Smith', 'smith', 'Peito', ['Tríceps', 'Ombros'], 'composto', { ref: ['supino', 1.0] }),
  x('supino-inclinado-smith', 'Supino inclinado no Smith', 'smith', 'Peito', ['Ombros', 'Tríceps'], 'composto', {
    ref: ['supino', 0.84],
  }),
  x('supino-maquina', 'Supino máquina (chest press)', 'maquina', 'Peito', ['Tríceps', 'Ombros'], 'composto', {
    ref: ['supino', 1.05],
  }),
  x('supino-maquina-inclinado', 'Supino inclinado máquina', 'maquina', 'Peito', ['Ombros'], 'composto', {
    ref: ['supino', 0.88],
  }),
  x('crucifixo-halter', 'Crucifixo com halteres', 'halter', 'Peito', ['Ombros'], 'isolado', {
    unilateral: true,
    ref: ['supino', 0.42],
    dica: 'Cotovelo levemente flexionado e fixo — o movimento é do ombro, não do braço.',
  }),
  x('crucifixo-inclinado-halter', 'Crucifixo inclinado com halteres', 'halter', 'Peito', ['Ombros'], 'isolado', {
    unilateral: true,
    ref: ['supino', 0.38],
  }),
  x('crucifixo-declinado-halter', 'Crucifixo declinado com halteres', 'halter', 'Peito', [], 'isolado', {
    unilateral: true,
    ref: ['supino', 0.44],
  }),
  x('peck-deck', 'Peck deck / voador máquina', 'maquina', 'Peito', ['Ombros'], 'isolado', { ref: ['supino', 0.55] }),
  x('crossover-alto', 'Crossover polia alta', 'polia', 'Peito', ['Ombros'], 'isolado', { ref: ['supino', 0.5] }),
  x('crossover-medio', 'Crossover polia média', 'polia', 'Peito', ['Ombros'], 'isolado', { ref: ['supino', 0.48] }),
  x('crossover-baixo', 'Crossover polia baixa', 'polia', 'Peito', ['Ombros'], 'isolado', { ref: ['supino', 0.42] }),
  x('crucifixo-polia-unilateral', 'Crucifixo unilateral na polia', 'polia', 'Peito', ['Ombros'], 'isolado', {
    unilateral: true,
    ref: ['supino', 0.4],
  }),
  x('flexao', 'Flexão de braço', 'peso-corporal', 'Peito', ['Tríceps', 'Ombros', 'Abdômen'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.64,
    ref: ['supino', 0.62],
  }),
  x('flexao-inclinada', 'Flexão inclinada (mãos elevadas)', 'peso-corporal', 'Peito', ['Tríceps'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.5,
    ref: ['supino', 0.5],
  }),
  x('flexao-declinada', 'Flexão declinada (pés elevados)', 'peso-corporal', 'Peito', ['Ombros', 'Tríceps'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.75,
    ref: ['supino', 0.72],
  }),
  x('flexao-diamante', 'Flexão diamante', 'peso-corporal', 'Tríceps', ['Peito'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.64,
    ref: ['supino', 0.52],
  }),
  x('paralelas-peito', 'Mergulho nas paralelas (ênfase peito)', 'peso-corporal', 'Peito', ['Tríceps', 'Ombros'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 1.0,
    ref: ['paralelas', 1.0],
    dica: 'Tronco inclinado à frente e cotovelos abertos deslocam a carga para o peito.',
  }),
  x('pullover-halter', 'Pullover com halter', 'halter', 'Peito', ['Costas', 'Tríceps'], 'isolado', { ref: ['supino', 0.4] }),
  x('pullover-polia', 'Pullover na polia alta', 'polia', 'Costas', ['Peito', 'Tríceps'], 'isolado', { ref: ['remada', 0.45] }),
  x('press-elastico', 'Supino com elástico', 'elastico', 'Peito', ['Tríceps'], 'composto', {}),
]

// --------------------------------- COSTAS ----------------------------------

const costas: Exercicio[] = [
  x('terra', 'Levantamento terra', 'barra', 'Costas', ['Posterior', 'Glúteos', 'Lombar', 'Trapézio'], 'composto', {
    ref: ['terra', 1.0],
    dica: 'Barra colada na canela, lombar neutra, quadril e ombros sobem juntos.',
  }),
  x('terra-sumo', 'Levantamento terra sumô', 'barra', 'Costas', ['Quadríceps', 'Glúteos', 'Posterior'], 'composto', {
    ref: ['terra', 1.03],
  }),
  x('terra-romeno', 'Levantamento terra romeno (RDL)', 'barra', 'Posterior', ['Glúteos', 'Lombar'], 'composto', {
    ref: ['terra', 0.85],
    dica: 'Joelho quase travado, quadril para trás. Pare quando a lombar começar a arredondar.',
  }),
  x('stiff', 'Stiff com barra', 'barra', 'Posterior', ['Glúteos', 'Lombar'], 'composto', { ref: ['terra', 0.8] }),
  x('stiff-halter', 'Stiff com halteres', 'halter', 'Posterior', ['Glúteos'], 'composto', {
    unilateral: true,
    ref: ['terra', 0.7],
  }),
  x('rack-pull', 'Rack pull', 'barra', 'Costas', ['Trapézio', 'Lombar'], 'composto', { ref: ['terra', 1.2] }),
  x('terra-hexagonal', 'Terra com barra hexagonal', 'barra', 'Costas', ['Quadríceps', 'Glúteos'], 'composto', {
    ref: ['terra', 1.05],
  }),
  x('barra-fixa-pronada', 'Barra fixa pronada', 'peso-corporal', 'Costas', ['Bíceps', 'Antebraço'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 1.0,
    ref: ['barra-fixa', 1.0],
  }),
  x('barra-fixa-supinada', 'Barra fixa supinada (chin-up)', 'peso-corporal', 'Costas', ['Bíceps'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 1.0,
    ref: ['barra-fixa', 1.05],
  }),
  x('barra-fixa-neutra', 'Barra fixa pegada neutra', 'peso-corporal', 'Costas', ['Bíceps', 'Antebraço'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 1.0,
    ref: ['barra-fixa', 1.03],
  }),
  x('barra-fixa-assistida', 'Barra fixa assistida (máquina)', 'maquina', 'Costas', ['Bíceps'], 'composto', {}),
  x('puxada-frontal', 'Puxada frontal na polia', 'polia', 'Costas', ['Bíceps'], 'composto', {
    ref: ['remada', 0.95],
    dica: 'Puxe com os cotovelos em direção ao quadril, peito estufado.',
  }),
  x('puxada-supinada', 'Puxada supinada na polia', 'polia', 'Costas', ['Bíceps'], 'composto', { ref: ['remada', 0.9] }),
  x('puxada-neutra', 'Puxada com triângulo (neutra)', 'polia', 'Costas', ['Bíceps'], 'composto', { ref: ['remada', 0.92] }),
  x('puxada-unilateral', 'Puxada unilateral na polia', 'polia', 'Costas', ['Bíceps'], 'composto', {
    unilateral: true,
    ref: ['remada', 0.42],
  }),
  x('remada-curvada', 'Remada curvada com barra', 'barra', 'Costas', ['Bíceps', 'Posterior', 'Lombar'], 'composto', {
    ref: ['remada', 1.0],
  }),
  x('remada-pendlay', 'Remada Pendlay', 'barra', 'Costas', ['Trapézio', 'Bíceps'], 'composto', { ref: ['remada', 0.95] }),
  x('remada-supinada', 'Remada curvada supinada', 'barra', 'Costas', ['Bíceps'], 'composto', { ref: ['remada', 1.02] }),
  x('remada-cavalinho', 'Remada cavalinho (T-bar)', 'maquina', 'Costas', ['Bíceps', 'Trapézio'], 'composto', {
    ref: ['remada', 1.1],
  }),
  x('remada-serrote', 'Remada serrote (unilateral com halter)', 'halter', 'Costas', ['Bíceps'], 'composto', {
    unilateral: true,
    ref: ['remada', 0.85],
  }),
  x('remada-halteres', 'Remada curvada com halteres', 'halter', 'Costas', ['Bíceps'], 'composto', {
    unilateral: true,
    ref: ['remada', 0.88],
  }),
  x('remada-baixa', 'Remada baixa na polia', 'polia', 'Costas', ['Bíceps'], 'composto', { ref: ['remada', 1.0] }),
  x('remada-maquina', 'Remada sentada na máquina', 'maquina', 'Costas', ['Bíceps'], 'composto', { ref: ['remada', 1.05] }),
  x('remada-smith', 'Remada curvada no Smith', 'smith', 'Costas', ['Bíceps'], 'composto', { ref: ['remada', 1.0] }),
  x('remada-peito-apoiado', 'Remada com peito apoiado', 'maquina', 'Costas', ['Bíceps'], 'composto', { ref: ['remada', 0.95] }),
  x('remada-invertida', 'Remada invertida (australiana)', 'peso-corporal', 'Costas', ['Bíceps'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.6,
    ref: ['remada', 0.55],
  }),
  x('pulldown-braco-reto', 'Pulldown com braço reto', 'polia', 'Costas', ['Tríceps'], 'isolado', { ref: ['remada', 0.4] }),
  x('face-pull', 'Face pull na polia', 'polia', 'Ombros', ['Costas', 'Trapézio'], 'isolado', {
    ref: ['desenvolvimento', 0.35],
    dica: 'Puxe até a altura do rosto e rode os ombros para fora no final.',
  }),
  x('encolhimento-barra', 'Encolhimento com barra', 'barra', 'Trapézio', ['Antebraço'], 'isolado', { ref: ['terra', 0.6] }),
  x('encolhimento-halter', 'Encolhimento com halteres', 'halter', 'Trapézio', ['Antebraço'], 'isolado', {
    unilateral: true,
    ref: ['terra', 0.55],
  }),
  x('encolhimento-smith', 'Encolhimento no Smith', 'smith', 'Trapézio', [], 'isolado', { ref: ['terra', 0.6] }),
  x('encolhimento-maquina', 'Encolhimento na máquina', 'maquina', 'Trapézio', [], 'isolado', { ref: ['terra', 0.65] }),
  x('hiperextensao', 'Hiperextensão lombar', 'peso-corporal', 'Lombar', ['Glúteos', 'Posterior'], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.5,
  }),
  x('good-morning', 'Good morning', 'barra', 'Posterior', ['Lombar', 'Glúteos'], 'composto', { ref: ['agachamento', 0.5] }),
  x('remada-elastico', 'Remada com elástico', 'elastico', 'Costas', ['Bíceps'], 'composto', {}),
]

// --------------------------------- OMBROS ----------------------------------

const ombros: Exercicio[] = [
  x('desenvolvimento-militar', 'Desenvolvimento militar com barra', 'barra', 'Ombros', ['Tríceps', 'Abdômen'], 'composto', {
    ref: ['desenvolvimento', 1.0],
    dica: 'Glúteo e abdômen contraídos — sem hiperextensão lombar.',
  }),
  x('desenvolvimento-sentado-barra', 'Desenvolvimento sentado com barra', 'barra', 'Ombros', ['Tríceps'], 'composto', {
    ref: ['desenvolvimento', 1.05],
  }),
  x('desenvolvimento-halter', 'Desenvolvimento com halteres', 'halter', 'Ombros', ['Tríceps'], 'composto', {
    unilateral: true,
    ref: ['desenvolvimento', 0.9],
  }),
  x('desenvolvimento-arnold', 'Desenvolvimento Arnold', 'halter', 'Ombros', ['Tríceps'], 'composto', {
    unilateral: true,
    ref: ['desenvolvimento', 0.82],
  }),
  x('desenvolvimento-maquina', 'Desenvolvimento na máquina', 'maquina', 'Ombros', ['Tríceps'], 'composto', {
    ref: ['desenvolvimento', 1.1],
  }),
  x('desenvolvimento-smith', 'Desenvolvimento no Smith', 'smith', 'Ombros', ['Tríceps'], 'composto', {
    ref: ['desenvolvimento', 1.0],
  }),
  x('push-press', 'Push press', 'barra', 'Ombros', ['Tríceps', 'Quadríceps'], 'composto', { ref: ['desenvolvimento', 1.25] }),
  x('landmine-press', 'Landmine press', 'barra', 'Ombros', ['Peito', 'Tríceps'], 'composto', {
    unilateral: true,
    ref: ['desenvolvimento', 0.5],
  }),
  x('elevacao-lateral-halter', 'Elevação lateral com halteres', 'halter', 'Ombros', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.35],
    dica: 'Suba até a linha do ombro. Peso alto demais vira encolhimento.',
  }),
  x('elevacao-lateral-polia', 'Elevação lateral na polia', 'polia', 'Ombros', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.15],
  }),
  x('elevacao-lateral-maquina', 'Elevação lateral na máquina', 'maquina', 'Ombros', [], 'isolado', {
    ref: ['desenvolvimento', 0.45],
  }),
  x('elevacao-lateral-inclinada', 'Elevação lateral inclinada', 'halter', 'Ombros', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.3],
  }),
  x('elevacao-frontal-halter', 'Elevação frontal com halteres', 'halter', 'Ombros', ['Peito'], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.35],
  }),
  x('elevacao-frontal-barra', 'Elevação frontal com barra', 'barra', 'Ombros', [], 'isolado', {
    ref: ['desenvolvimento', 0.4],
  }),
  x('elevacao-frontal-polia', 'Elevação frontal na polia', 'polia', 'Ombros', [], 'isolado', {
    ref: ['desenvolvimento', 0.32],
  }),
  x('crucifixo-inverso-halter', 'Crucifixo inverso com halteres', 'halter', 'Ombros', ['Costas', 'Trapézio'], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.32],
  }),
  x('crucifixo-inverso-maquina', 'Crucifixo inverso na máquina', 'maquina', 'Ombros', ['Costas'], 'isolado', {
    ref: ['desenvolvimento', 0.45],
  }),
  x('crucifixo-inverso-polia', 'Crucifixo inverso na polia', 'polia', 'Ombros', ['Costas'], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.18],
  }),
  x('remada-alta', 'Remada alta com barra', 'barra', 'Ombros', ['Trapézio', 'Bíceps'], 'composto', {
    ref: ['desenvolvimento', 0.6],
  }),
  x('remada-alta-polia', 'Remada alta na polia', 'polia', 'Ombros', ['Trapézio'], 'composto', {
    ref: ['desenvolvimento', 0.6],
  }),
  x('desenvolvimento-elastico', 'Desenvolvimento com elástico', 'elastico', 'Ombros', ['Tríceps'], 'composto', {}),
  x('rotacao-externa-polia', 'Rotação externa na polia (manguito)', 'polia', 'Ombros', [], 'isolado', {
    unilateral: true,
    dica: 'Trabalho preventivo — carga leve, execução lenta.',
  }),
  x('pike-push-up', 'Pike push-up', 'peso-corporal', 'Ombros', ['Tríceps'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.7,
    ref: ['desenvolvimento', 0.6],
  }),
  x('handstand-push-up', 'Flexão em parada de mãos', 'peso-corporal', 'Ombros', ['Tríceps'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.9,
    ref: ['desenvolvimento', 0.95],
  }),
]

// --------------------------------- BÍCEPS ----------------------------------

const biceps: Exercicio[] = [
  x('rosca-direta-barra', 'Rosca direta com barra', 'barra', 'Bíceps', ['Antebraço'], 'isolado', {
    ref: ['desenvolvimento', 0.75],
  }),
  x('rosca-ez', 'Rosca direta com barra EZ', 'barra', 'Bíceps', ['Antebraço'], 'isolado', { ref: ['desenvolvimento', 0.78] }),
  x('rosca-halter-alternada', 'Rosca alternada com halteres', 'halter', 'Bíceps', ['Antebraço'], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.7],
  }),
  x('rosca-halter-simultanea', 'Rosca simultânea com halteres', 'halter', 'Bíceps', ['Antebraço'], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.7],
  }),
  x('rosca-martelo', 'Rosca martelo', 'halter', 'Bíceps', ['Antebraço'], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.75],
  }),
  x('rosca-martelo-corda', 'Rosca martelo na corda', 'polia', 'Bíceps', ['Antebraço'], 'isolado', {
    ref: ['desenvolvimento', 0.72],
  }),
  x('rosca-scott-barra', 'Rosca Scott com barra', 'barra', 'Bíceps', [], 'isolado', { ref: ['desenvolvimento', 0.65] }),
  x('rosca-scott-halter', 'Rosca Scott com halter', 'halter', 'Bíceps', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.6],
  }),
  x('rosca-scott-maquina', 'Rosca Scott na máquina', 'maquina', 'Bíceps', [], 'isolado', { ref: ['desenvolvimento', 0.7] }),
  x('rosca-concentrada', 'Rosca concentrada', 'halter', 'Bíceps', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.45],
  }),
  x('rosca-inclinada', 'Rosca inclinada no banco', 'halter', 'Bíceps', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.6],
  }),
  x('rosca-polia-baixa', 'Rosca na polia baixa', 'polia', 'Bíceps', ['Antebraço'], 'isolado', {
    ref: ['desenvolvimento', 0.72],
  }),
  x('rosca-polia-alta', 'Rosca na polia alta (dupla)', 'polia', 'Bíceps', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.3],
  }),
  x('rosca-inversa', 'Rosca inversa', 'barra', 'Antebraço', ['Bíceps'], 'isolado', { ref: ['desenvolvimento', 0.55] }),
  x('rosca-21', 'Rosca 21', 'barra', 'Bíceps', [], 'isolado', { ref: ['desenvolvimento', 0.5] }),
  x('rosca-spider', 'Rosca spider', 'halter', 'Bíceps', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.5],
  }),
  x('rosca-elastico', 'Rosca com elástico', 'elastico', 'Bíceps', ['Antebraço'], 'isolado', {}),
]

// --------------------------------- TRÍCEPS ---------------------------------

const triceps: Exercicio[] = [
  x('triceps-testa', 'Tríceps testa com barra EZ', 'barra', 'Tríceps', [], 'isolado', { ref: ['desenvolvimento', 0.75] }),
  x('triceps-testa-halter', 'Tríceps testa com halteres', 'halter', 'Tríceps', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.7],
  }),
  x('triceps-corda', 'Tríceps na corda (polia alta)', 'polia', 'Tríceps', [], 'isolado', {
    ref: ['desenvolvimento', 0.7],
    dica: 'Abra a corda no final do movimento para completar a extensão.',
  }),
  x('triceps-barra-polia', 'Tríceps barra reta na polia', 'polia', 'Tríceps', [], 'isolado', {
    ref: ['desenvolvimento', 0.85],
  }),
  x('triceps-barra-v', 'Tríceps barra V na polia', 'polia', 'Tríceps', [], 'isolado', { ref: ['desenvolvimento', 0.85] }),
  x('triceps-unilateral-polia', 'Tríceps unilateral na polia', 'polia', 'Tríceps', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.35],
  }),
  x('triceps-frances', 'Tríceps francês (acima da cabeça)', 'halter', 'Tríceps', [], 'isolado', {
    ref: ['desenvolvimento', 0.6],
  }),
  x('triceps-frances-corda', 'Tríceps francês na corda', 'polia', 'Tríceps', [], 'isolado', { ref: ['desenvolvimento', 0.6] }),
  x('triceps-coice', 'Tríceps coice (kickback)', 'halter', 'Tríceps', [], 'isolado', {
    unilateral: true,
    ref: ['desenvolvimento', 0.28],
  }),
  x('triceps-maquina', 'Tríceps na máquina', 'maquina', 'Tríceps', [], 'isolado', { ref: ['desenvolvimento', 0.9] }),
  x('mergulho-banco', 'Mergulho no banco', 'peso-corporal', 'Tríceps', ['Peito', 'Ombros'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.6,
    ref: ['paralelas', 0.65],
  }),
  x('paralelas-triceps', 'Paralelas (ênfase tríceps)', 'peso-corporal', 'Tríceps', ['Peito', 'Ombros'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 1.0,
    ref: ['paralelas', 1.0],
    dica: 'Tronco vertical e cotovelos rentes ao corpo puxam a carga para o tríceps.',
  }),
  x('triceps-elastico', 'Tríceps com elástico', 'elastico', 'Tríceps', [], 'isolado', {}),
]

// ------------------------------- QUADRÍCEPS --------------------------------

const quadriceps: Exercicio[] = [
  x('agachamento-livre', 'Agachamento livre', 'barra', 'Quadríceps', ['Glúteos', 'Posterior', 'Lombar'], 'composto', {
    ref: ['agachamento', 1.0],
    dica: 'Desça pelo menos até a coxa paralela ao chão, joelhos acompanhando a linha dos pés.',
  }),
  x('agachamento-frontal', 'Agachamento frontal', 'barra', 'Quadríceps', ['Glúteos', 'Abdômen'], 'composto', {
    ref: ['agachamento', 0.82],
  }),
  x('agachamento-smith', 'Agachamento no Smith', 'smith', 'Quadríceps', ['Glúteos'], 'composto', {
    ref: ['agachamento', 1.05],
  }),
  x('agachamento-hack', 'Agachamento hack (máquina)', 'maquina', 'Quadríceps', ['Glúteos'], 'composto', {
    ref: ['agachamento', 1.3],
  }),
  x('agachamento-pendulo', 'Agachamento pêndulo', 'maquina', 'Quadríceps', ['Glúteos'], 'composto', {
    ref: ['agachamento', 1.2],
  }),
  x('agachamento-sumo', 'Agachamento sumô com barra', 'barra', 'Quadríceps', ['Glúteos'], 'composto', {
    ref: ['agachamento', 0.95],
  }),
  x('agachamento-goblet', 'Agachamento goblet', 'halter', 'Quadríceps', ['Glúteos', 'Abdômen'], 'composto', {
    ref: ['agachamento', 0.5],
  }),
  x('agachamento-bulgaro', 'Agachamento búlgaro', 'halter', 'Quadríceps', ['Glúteos'], 'composto', {
    unilateral: true,
    ref: ['agachamento', 0.6],
  }),
  x('agachamento-livre-peso-corporal', 'Agachamento livre (peso corporal)', 'peso-corporal', 'Quadríceps', ['Glúteos'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.7,
  }),
  x('pistol-squat', 'Pistol squat (agachamento unilateral)', 'peso-corporal', 'Quadríceps', ['Glúteos', 'Abdômen'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.85,
    ref: ['agachamento', 0.5],
  }),
  x('leg-press-45', 'Leg press 45°', 'maquina', 'Quadríceps', ['Glúteos', 'Posterior'], 'composto', {
    ref: ['agachamento', 2.0],
  }),
  x('leg-press-horizontal', 'Leg press horizontal', 'maquina', 'Quadríceps', ['Glúteos'], 'composto', {
    ref: ['agachamento', 1.7],
  }),
  x('leg-press-unilateral', 'Leg press unilateral', 'maquina', 'Quadríceps', ['Glúteos'], 'composto', {
    unilateral: true,
    ref: ['agachamento', 1.0],
  }),
  x('cadeira-extensora', 'Cadeira extensora', 'maquina', 'Quadríceps', [], 'isolado', { ref: ['agachamento', 0.75] }),
  x('cadeira-extensora-unilateral', 'Cadeira extensora unilateral', 'maquina', 'Quadríceps', [], 'isolado', {
    unilateral: true,
    ref: ['agachamento', 0.4],
  }),
  x('afundo', 'Afundo (passada estática)', 'halter', 'Quadríceps', ['Glúteos'], 'composto', {
    unilateral: true,
    ref: ['agachamento', 0.6],
  }),
  x('afundo-barra', 'Afundo com barra', 'barra', 'Quadríceps', ['Glúteos'], 'composto', { ref: ['agachamento', 0.65] }),
  x('passada-caminhando', 'Passada caminhando', 'halter', 'Quadríceps', ['Glúteos'], 'composto', {
    unilateral: true,
    ref: ['agachamento', 0.55],
  }),
  x('step-up', 'Step-up no banco', 'halter', 'Quadríceps', ['Glúteos'], 'composto', {
    unilateral: true,
    ref: ['agachamento', 0.5],
  }),
  x('sissy-squat', 'Sissy squat', 'peso-corporal', 'Quadríceps', [], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.6,
  }),
  x('agachamento-elastico', 'Agachamento com elástico', 'elastico', 'Quadríceps', ['Glúteos'], 'composto', {}),
]

// ------------------------- POSTERIOR / GLÚTEOS -----------------------------

const posteriorGluteos: Exercicio[] = [
  x('mesa-flexora', 'Mesa flexora', 'maquina', 'Posterior', ['Panturrilha'], 'isolado', { ref: ['agachamento', 0.5] }),
  x('cadeira-flexora', 'Cadeira flexora (sentado)', 'maquina', 'Posterior', [], 'isolado', { ref: ['agachamento', 0.55] }),
  x('flexora-em-pe', 'Flexora em pé unilateral', 'maquina', 'Posterior', [], 'isolado', {
    unilateral: true,
    ref: ['agachamento', 0.28],
  }),
  x('nordic-curl', 'Nordic curl', 'peso-corporal', 'Posterior', ['Glúteos'], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.6,
  }),
  x('elevacao-pelvica', 'Elevação pélvica (hip thrust)', 'barra', 'Glúteos', ['Posterior', 'Quadríceps'], 'composto', {
    ref: ['agachamento', 1.25],
    dica: 'Queixo travado no peito e costelas para baixo — a extensão vem do quadril.',
  }),
  x('elevacao-pelvica-maquina', 'Hip thrust na máquina', 'maquina', 'Glúteos', ['Posterior'], 'composto', {
    ref: ['agachamento', 1.4],
  }),
  x('ponte-gluteo', 'Ponte de glúteo', 'peso-corporal', 'Glúteos', ['Posterior'], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.45,
  }),
  x('coice-polia', 'Coice de glúteo na polia', 'polia', 'Glúteos', ['Posterior'], 'isolado', {
    unilateral: true,
    ref: ['agachamento', 0.3],
  }),
  x('coice-maquina', 'Glúteo na máquina (kickback)', 'maquina', 'Glúteos', ['Posterior'], 'isolado', {
    unilateral: true,
    ref: ['agachamento', 0.35],
  }),
  x('abducao-maquina', 'Cadeira abdutora', 'maquina', 'Glúteos', [], 'isolado', { ref: ['agachamento', 0.6] }),
  x('aducao-maquina', 'Cadeira adutora', 'maquina', 'Quadríceps', ['Glúteos'], 'isolado', { ref: ['agachamento', 0.55] }),
  x('abducao-polia', 'Abdução de quadril na polia', 'polia', 'Glúteos', [], 'isolado', {
    unilateral: true,
    ref: ['agachamento', 0.2],
  }),
  x('abducao-elastico', 'Abdução com elástico (fire hydrant)', 'elastico', 'Glúteos', [], 'isolado', {}),
  x('bom-dia-halter', 'Good morning com halter', 'halter', 'Posterior', ['Lombar'], 'composto', {
    ref: ['agachamento', 0.35],
  }),
  x('terra-unilateral', 'Terra unilateral com halter', 'halter', 'Posterior', ['Glúteos', 'Abdômen'], 'composto', {
    unilateral: true,
    ref: ['terra', 0.45],
  }),
  x('kettlebell-swing', 'Kettlebell swing', 'kettlebell', 'Glúteos', ['Posterior', 'Lombar'], 'composto', {
    ref: ['terra', 0.35],
  }),
]

// ------------------------------ PANTURRILHA --------------------------------

const panturrilha: Exercicio[] = [
  x('panturrilha-em-pe', 'Panturrilha em pé (máquina)', 'maquina', 'Panturrilha', [], 'isolado', {
    ref: ['agachamento', 1.1],
  }),
  x('panturrilha-sentado', 'Panturrilha sentado', 'maquina', 'Panturrilha', [], 'isolado', { ref: ['agachamento', 0.6] }),
  x('panturrilha-leg-press', 'Panturrilha no leg press', 'maquina', 'Panturrilha', [], 'isolado', {
    ref: ['agachamento', 1.4],
  }),
  x('panturrilha-smith', 'Panturrilha no Smith', 'smith', 'Panturrilha', [], 'isolado', { ref: ['agachamento', 1.0] }),
  x('panturrilha-halter', 'Panturrilha em pé com halteres', 'halter', 'Panturrilha', [], 'isolado', {
    unilateral: true,
    ref: ['agachamento', 0.5],
  }),
  x('panturrilha-unilateral', 'Panturrilha unilateral (degrau)', 'peso-corporal', 'Panturrilha', [], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.9,
  }),
  x('panturrilha-burrinho', 'Panturrilha burrinho (donkey calf)', 'maquina', 'Panturrilha', [], 'isolado', {
    ref: ['agachamento', 1.2],
  }),
]

// -------------------------------- ABDÔMEN ----------------------------------

const abdomen: Exercicio[] = [
  x('abdominal-supra', 'Abdominal supra (crunch)', 'peso-corporal', 'Abdômen', [], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.3,
  }),
  x('abdominal-infra', 'Abdominal infra (elevação de pernas no solo)', 'peso-corporal', 'Abdômen', [], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.35,
  }),
  x('elevacao-pernas-barra', 'Elevação de pernas na barra', 'peso-corporal', 'Abdômen', ['Antebraço'], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.45,
  }),
  x('elevacao-joelhos-paralela', 'Elevação de joelhos na paralela', 'peso-corporal', 'Abdômen', [], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.4,
  }),
  x('abdominal-polia', 'Abdominal na polia alta', 'polia', 'Abdômen', [], 'isolado', {}),
  x('abdominal-maquina', 'Abdominal na máquina', 'maquina', 'Abdômen', [], 'isolado', {}),
  x('prancha', 'Prancha isométrica', 'peso-corporal', 'Abdômen', ['Ombros', 'Lombar'], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.6,
    dica: 'Registre as repetições como segundos de sustentação.',
  }),
  x('prancha-lateral', 'Prancha lateral', 'peso-corporal', 'Abdômen', ['Lombar'], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.5,
  }),
  x('ab-wheel', 'Roda abdominal (ab wheel)', 'peso-corporal', 'Abdômen', ['Ombros', 'Lombar'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.6,
  }),
  x('russian-twist', 'Russian twist', 'halter', 'Abdômen', [], 'isolado', {}),
  x('bicicleta-abdominal', 'Abdominal bicicleta', 'peso-corporal', 'Abdômen', [], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.3,
  }),
  x('pallof-press', 'Pallof press na polia', 'polia', 'Abdômen', [], 'isolado', { unilateral: true }),
  x('dragon-flag', 'Dragon flag', 'peso-corporal', 'Abdômen', ['Lombar'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.8,
  }),
  x('hollow-hold', 'Hollow hold', 'peso-corporal', 'Abdômen', [], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.5,
  }),
  x('abdominal-canivete', 'Abdominal canivete', 'peso-corporal', 'Abdômen', [], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.45,
  }),
]

// ------------------------------- ANTEBRAÇO ---------------------------------

const antebraco: Exercicio[] = [
  x('rosca-punho', 'Rosca de punho', 'barra', 'Antebraço', [], 'isolado', {}),
  x('rosca-punho-inversa', 'Rosca de punho inversa', 'barra', 'Antebraço', [], 'isolado', {}),
  x('farmer-walk', 'Farmer walk (caminhada do fazendeiro)', 'halter', 'Antebraço', ['Trapézio', 'Abdômen'], 'composto', {
    unilateral: true,
    ref: ['terra', 0.6],
  }),
  x('pendura-barra', 'Pendura na barra (dead hang)', 'peso-corporal', 'Antebraço', ['Costas'], 'isolado', {
    usaPesoCorporal: true,
    fracaoCorporal: 1.0,
  }),
  x('rosca-punho-polia', 'Rosca de punho na polia', 'polia', 'Antebraço', [], 'isolado', {}),
  x('hand-grip', 'Hand grip', 'peso-corporal', 'Antebraço', [], 'isolado', {}),
]

// ----------------------------- CORPO INTEIRO -------------------------------

const corpoInteiro: Exercicio[] = [
  x('clean', 'Clean (arranco até o ombro)', 'barra', 'Corpo inteiro', ['Costas', 'Quadríceps', 'Ombros'], 'composto', {
    ref: ['terra', 0.6],
  }),
  x('power-clean', 'Power clean', 'barra', 'Corpo inteiro', ['Costas', 'Quadríceps'], 'composto', { ref: ['terra', 0.62] }),
  x('snatch', 'Snatch (arranco)', 'barra', 'Corpo inteiro', ['Ombros', 'Costas'], 'composto', { ref: ['terra', 0.45] }),
  x('clean-and-jerk', 'Clean and jerk', 'barra', 'Corpo inteiro', ['Ombros', 'Quadríceps'], 'composto', {
    ref: ['terra', 0.55],
  }),
  x('thruster', 'Thruster', 'barra', 'Corpo inteiro', ['Quadríceps', 'Ombros'], 'composto', { ref: ['desenvolvimento', 0.9] }),
  x('burpee', 'Burpee', 'peso-corporal', 'Corpo inteiro', ['Peito', 'Quadríceps'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 0.8,
  }),
  x('muscle-up', 'Muscle up', 'peso-corporal', 'Corpo inteiro', ['Costas', 'Peito', 'Tríceps'], 'composto', {
    usaPesoCorporal: true,
    fracaoCorporal: 1.0,
    ref: ['barra-fixa', 1.35],
  }),
  x('kettlebell-clean', 'Kettlebell clean', 'kettlebell', 'Corpo inteiro', ['Ombros', 'Glúteos'], 'composto', {
    unilateral: true,
  }),
  x('kettlebell-snatch', 'Kettlebell snatch', 'kettlebell', 'Corpo inteiro', ['Ombros', 'Glúteos'], 'composto', {
    unilateral: true,
  }),
  x('turkish-get-up', 'Turkish get-up', 'kettlebell', 'Corpo inteiro', ['Ombros', 'Abdômen'], 'composto', {
    unilateral: true,
  }),
  x('battle-rope', 'Battle rope', 'peso-corporal', 'Corpo inteiro', ['Ombros'], 'cardio', {}),
  x('sled-push', 'Empurrada de trenó', 'maquina', 'Corpo inteiro', ['Quadríceps', 'Glúteos'], 'composto', {}),
  x('wall-ball', 'Wall ball', 'peso-corporal', 'Corpo inteiro', ['Quadríceps', 'Ombros'], 'composto', {}),
]

// --------------------------------- CARDIO ----------------------------------

const cardio: Exercicio[] = [
  x('esteira-caminhada', 'Esteira — caminhada', 'cardio', 'Cardio', [], 'cardio', {}),
  x('esteira-corrida', 'Esteira — corrida', 'cardio', 'Cardio', [], 'cardio', {}),
  x('corrida-rua', 'Corrida ao ar livre', 'cardio', 'Cardio', [], 'cardio', {}),
  x('bike-ergometrica', 'Bicicleta ergométrica', 'cardio', 'Cardio', [], 'cardio', {}),
  x('bike-spinning', 'Spinning', 'cardio', 'Cardio', [], 'cardio', {}),
  x('eliptico', 'Elíptico', 'cardio', 'Cardio', [], 'cardio', {}),
  x('remo-ergometro', 'Remo ergômetro', 'cardio', 'Cardio', ['Costas'], 'cardio', {}),
  x('escada-simulador', 'Simulador de escada', 'cardio', 'Cardio', ['Glúteos'], 'cardio', {}),
  x('pular-corda', 'Pular corda', 'cardio', 'Cardio', ['Panturrilha'], 'cardio', {}),
  x('natacao', 'Natação', 'cardio', 'Cardio', ['Costas', 'Ombros'], 'cardio', {}),
  x('hiit', 'HIIT (intervalado)', 'cardio', 'Cardio', [], 'cardio', {}),
  x('caminhada-inclinada', 'Caminhada inclinada', 'cardio', 'Cardio', ['Glúteos'], 'cardio', {}),
]

export const EXERCICIOS: Exercicio[] = [
  ...peito,
  ...costas,
  ...ombros,
  ...biceps,
  ...triceps,
  ...quadriceps,
  ...posteriorGluteos,
  ...panturrilha,
  ...abdomen,
  ...antebraco,
  ...corpoInteiro,
  ...cardio,
]

export const EXERCICIOS_POR_ID: Record<string, Exercicio> = Object.fromEntries(
  EXERCICIOS.map((e) => [e.id, e]),
)

export const GRUPOS: GrupoMuscular[] = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Trapézio',
  'Quadríceps',
  'Posterior',
  'Glúteos',
  'Panturrilha',
  'Abdômen',
  'Lombar',
  'Corpo inteiro',
  'Cardio',
]

export const EQUIPAMENTOS: { id: Equipamento; nome: string }[] = [
  { id: 'barra', nome: 'Barra' },
  { id: 'halter', nome: 'Halteres' },
  { id: 'polia', nome: 'Polia / cabo' },
  { id: 'maquina', nome: 'Máquina' },
  { id: 'smith', nome: 'Smith' },
  { id: 'peso-corporal', nome: 'Peso corporal' },
  { id: 'kettlebell', nome: 'Kettlebell' },
  { id: 'elastico', nome: 'Elástico' },
  { id: 'cardio', nome: 'Cardio' },
]

/** Normaliza texto para busca — remove acentos e caixa. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function buscarExercicios(
  termo: string,
  filtros: { grupo?: GrupoMuscular | null; equipamento?: Equipamento | null } = {},
): Exercicio[] {
  const t = normalizar(termo)
  return EXERCICIOS.filter((e) => {
    if (filtros.grupo && e.grupo !== filtros.grupo) return false
    if (filtros.equipamento && e.equipamento !== filtros.equipamento) return false
    if (!t) return true
    return normalizar(e.nome).includes(t) || normalizar(e.grupo).includes(t)
  })
}
