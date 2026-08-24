import type { Exercicio } from '../types'

// ---------------------------------------------------------------------------
// Qual desenho representa cada exercício.
//
// São 206 exercícios e 30 desenhos. A conta fecha porque o que muda entre
// supino reto com barra, com halter, no Smith e na máquina é o equipamento,
// não o movimento — o corpo faz a mesma coisa. Então o desenho é montado em
// duas partes: a POSE, escolhida aqui, e o EQUIPAMENTO, que vem do próprio
// exercício e é desenhado por cima.
//
// As regras leem o `id`, que é estável e descritivo. A ordem importa: a
// primeira que casar vence, então o específico vem antes do genérico —
// `rosca-punho` antes de `rosca`, `remada-alta` antes de `remada`.
// ---------------------------------------------------------------------------

export type PoseId =
  | 'supino'
  | 'crucifixo'
  | 'flexao'
  | 'paralelas'
  | 'desenvolvimento'
  | 'elevacao-lateral'
  | 'elevacao-frontal'
  | 'crucifixo-inverso'
  | 'remada-alta'
  | 'puxada'
  | 'remada'
  | 'terra'
  | 'agachamento'
  | 'afundo'
  | 'leg-press'
  | 'extensao-joelho'
  | 'flexao-joelho'
  | 'panturrilha'
  | 'rosca'
  | 'rosca-punho'
  | 'triceps'
  | 'triceps-testa'
  | 'triceps-frances'
  | 'abdominal'
  | 'prancha'
  | 'encolhimento'
  | 'ponte'
  | 'coice'
  | 'swing'
  | 'olimpico'
  | 'carregado'
  | 'corrida'
  | 'bike'
  | 'remo'
  | 'corda'
  | 'natacao'

const REGRAS: [RegExp, PoseId][] = [
  // --- o específico primeiro ---
  [/^triceps-testa/, 'triceps-testa'],
  [/^triceps-frances/, 'triceps-frances'],
  [/^rosca-punho|^hand-grip/, 'rosca-punho'],
  [/^remada-alta/, 'remada-alta'],
  [/^crucifixo-inverso|^face-pull|^rotacao-externa/, 'crucifixo-inverso'],
  [/^elevacao-lateral/, 'elevacao-lateral'],
  [/^elevacao-frontal/, 'elevacao-frontal'],
  [/^elevacao-pelvica|^ponte-gluteo/, 'ponte'],
  [/^elevacao-pernas|^elevacao-joelhos/, 'abdominal'],
  [/^flexao-diamante|^flexao-inclinada|^flexao-declinada|^flexao$/, 'flexao'],
  [/^flexora|^mesa-flexora|^cadeira-flexora|^nordic-curl/, 'flexao-joelho'],
  [/^cadeira-extensora/, 'extensao-joelho'],
  [/^agachamento-bulgaro/, 'afundo'],

  // --- cardio ---
  [/^esteira|^corrida|^caminhada|^escada|^hiit/, 'corrida'],
  [/^bike|^eliptico/, 'bike'],
  [/^remo-ergometro/, 'remo'],
  [/^pular-corda/, 'corda'],
  [/^natacao/, 'natacao'],

  // --- padrões de movimento ---
  [/^supino|^press-elastico|^landmine-press/, 'supino'],
  [/^crucifixo|^peck-deck|^crossover|^pullover/, 'crucifixo'],
  [/^paralelas|^mergulho-banco/, 'paralelas'],
  [/^desenvolvimento|^push-press|^thruster|^pike-push-up|^handstand/, 'desenvolvimento'],
  [/^puxada|^barra-fixa|^pulldown|^muscle-up|^pendura-barra/, 'puxada'],
  [/^remada/, 'remada'],
  [/^terra|^rack-pull|^stiff|^good-morning|^bom-dia|^hiperextensao/, 'terra'],
  [/^agachamento|^pistol-squat|^sissy-squat|^wall-ball/, 'agachamento'],
  [/^afundo|^passada|^step-up/, 'afundo'],
  [/^leg-press/, 'leg-press'],
  [/^panturrilha/, 'panturrilha'],
  [/^rosca/, 'rosca'],
  [/^triceps/, 'triceps'],
  [/^prancha|^pallof/, 'prancha'],
  [/^abdominal|^ab-wheel|^russian-twist|^bicicleta|^dragon-flag|^hollow/, 'abdominal'],
  [/^encolhimento/, 'encolhimento'],
  [/^coice|^abducao|^aducao/, 'coice'],
  [/^kettlebell-swing|^kettlebell-clean|^kettlebell-snatch/, 'swing'],
  [/^clean|^power-clean|^snatch|^turkish/, 'olimpico'],
  [/^burpee/, 'olimpico'],
  [/^farmer-walk|^sled-push|^battle-rope/, 'carregado'],
]

/** Rede de segurança: se nenhuma regra casar, o grupo muscular decide. */
const POR_GRUPO: Record<string, PoseId> = {
  Peito: 'supino',
  Tríceps: 'triceps',
  Costas: 'remada',
  Posterior: 'flexao-joelho',
  Ombros: 'desenvolvimento',
  Trapézio: 'encolhimento',
  Lombar: 'terra',
  Bíceps: 'rosca',
  Antebraço: 'rosca-punho',
  Quadríceps: 'agachamento',
  Glúteos: 'ponte',
  Panturrilha: 'panturrilha',
  Abdômen: 'abdominal',
  'Corpo inteiro': 'olimpico',
  Cardio: 'corrida',
}

export function poseDoExercicio(ex: Pick<Exercicio, 'id' | 'grupo'>): PoseId {
  for (const [padrao, pose] of REGRAS) {
    if (padrao.test(ex.id)) return pose
  }
  return POR_GRUPO[ex.grupo] ?? 'agachamento'
}

// ---------------------------------------------------------------------------
// Coordenadas das poses.
//
// Ficam aqui, e não no componente, para poderem ser conferidas por teste: que
// todo exercício chega numa pose existente, que toda pose é usada por algum
// exercício e que nenhuma articulação sai do quadro.
// ---------------------------------------------------------------------------

export type P = [number, number]

export interface Pose {
  cabeca: P
  peito: P
  quadril: P
  cotovelo: P
  mao: P
  joelho: P
  pe: P
  /** Membros do lado oposto, desenhados esmaecidos para dar profundidade. */
  cotovelo2?: P
  mao2?: P
  joelho2?: P
  pe2?: P
  /** Banco, chão, assento — o que sustenta o corpo. */
  apoios?: Apoio[]
  /** Ponto fixo de onde sai o cabo ou o elástico. */
  ancora?: P
  /** Como o equipamento se apoia: nas mãos (padrão), nos ombros ou nos pés. */
  carga?: 'mao' | 'ombro' | 'pe' | 'nenhum'
  /** Traços próprios da figura — a roda da bike, o arco da corda. */
  extras?: Extra[]
}

type Apoio =
  | { tipo: 'linha'; de: P; para: P }
  | { tipo: 'banco'; de: P; para: P; pe?: number }

type Extra =
  | { tipo: 'linha'; de: P; para: P; fraco?: boolean }
  | { tipo: 'circulo'; c: P; r: number; fraco?: boolean }
  | { tipo: 'arco'; d: string; fraco?: boolean }

// --------------------------------- Poses -----------------------------------

export const POSES: Record<PoseId, Pose> = {
  supino: {
    cabeca: [13, 27], peito: [19, 29], quadril: [30, 30], joelho: [37, 33], pe: [40, 42],
    cotovelo: [19, 23], mao: [20, 16],
    joelho2: [36, 35], pe2: [38, 42],
    apoios: [{ tipo: 'banco', de: [10, 33], para: [33, 33], pe: 42 }],
  },
  crucifixo: {
    cabeca: [13, 27], peito: [19, 29], quadril: [30, 30], joelho: [37, 33], pe: [40, 42],
    cotovelo: [13, 21], mao: [8, 17],
    cotovelo2: [25, 21], mao2: [30, 17],
    apoios: [{ tipo: 'banco', de: [10, 33], para: [33, 33], pe: 42 }],
  },
  flexao: {
    cabeca: [12, 24], peito: [17, 27], quadril: [29, 32], joelho: [36, 35], pe: [43, 38],
    cotovelo: [14, 33], mao: [12, 40],
    apoios: [{ tipo: 'linha', de: [6, 41], para: [44, 41] }],
    carga: 'nenhum',
  },
  paralelas: {
    cabeca: [24, 13], peito: [24, 20], quadril: [25, 29], joelho: [31, 34], pe: [34, 40],
    cotovelo: [17, 24], mao: [15, 30],
    apoios: [
      { tipo: 'linha', de: [10, 29], para: [20, 29] },
      { tipo: 'linha', de: [28, 29], para: [38, 29] },
    ],
    carga: 'nenhum',
  },
  desenvolvimento: {
    cabeca: [24, 14], peito: [24, 21], quadril: [24, 30], joelho: [24, 37], pe: [24, 44],
    cotovelo: [18, 17], mao: [21, 8],
    cotovelo2: [30, 17], mao2: [27, 8],
  },
  'elevacao-lateral': {
    cabeca: [24, 12], peito: [24, 19], quadril: [24, 29], joelho: [24, 37], pe: [24, 44],
    cotovelo: [16, 20], mao: [9, 19],
    cotovelo2: [32, 20], mao2: [39, 19],
  },
  'elevacao-frontal': {
    cabeca: [20, 12], peito: [21, 19], quadril: [21, 29], joelho: [21, 37], pe: [21, 44],
    cotovelo: [28, 19], mao: [36, 19],
  },
  'crucifixo-inverso': {
    cabeca: [12, 20], peito: [18, 22], quadril: [30, 25], joelho: [30, 34], pe: [30, 43],
    cotovelo: [18, 30], mao: [11, 31],
    cotovelo2: [24, 30], mao2: [31, 31],
  },
  'remada-alta': {
    cabeca: [24, 12], peito: [24, 19], quadril: [24, 29], joelho: [24, 37], pe: [24, 44],
    cotovelo: [15, 20], mao: [22, 23],
  },
  puxada: {
    cabeca: [24, 18], peito: [24, 24], quadril: [24, 32], joelho: [27, 39], pe: [24, 45],
    cotovelo: [17, 18], mao: [18, 9],
    cotovelo2: [31, 18], mao2: [30, 9],
    apoios: [{ tipo: 'linha', de: [10, 6], para: [38, 6] }],
    carga: 'nenhum',
  },
  remada: {
    cabeca: [11, 19], peito: [17, 22], quadril: [30, 25], joelho: [30, 34], pe: [28, 44],
    cotovelo: [18, 31], mao: [17, 25],
  },
  terra: {
    cabeca: [14, 16], peito: [18, 22], quadril: [30, 28], joelho: [26, 36], pe: [26, 44],
    cotovelo: [19, 30], mao: [19, 38],
  },
  agachamento: {
    cabeca: [20, 12], peito: [22, 19], quadril: [30, 29], joelho: [21, 35], pe: [25, 44],
    cotovelo: [27, 22], mao: [22, 18],
    carga: 'ombro',
  },
  afundo: {
    cabeca: [24, 12], peito: [24, 19], quadril: [25, 28], joelho: [17, 34], pe: [14, 43],
    cotovelo: [24, 24], mao: [24, 31],
    joelho2: [33, 34], pe2: [38, 43],
  },
  'leg-press': {
    cabeca: [10, 30], peito: [15, 31], quadril: [22, 33], joelho: [30, 27], pe: [37, 22],
    joelho2: [30, 31], pe2: [37, 26],
    cotovelo: [15, 36], mao: [11, 38],
    apoios: [{ tipo: 'linha', de: [7, 34], para: [24, 36] }],
    carga: 'pe',
  },
  'extensao-joelho': {
    cabeca: [13, 17], peito: [16, 23], quadril: [21, 32], joelho: [31, 32], pe: [39, 29],
    cotovelo: [17, 28], mao: [22, 27],
    apoios: [{ tipo: 'banco', de: [13, 34], para: [26, 34], pe: 43 }],
    carga: 'pe',
  },
  'flexao-joelho': {
    cabeca: [10, 29], peito: [16, 31], quadril: [28, 32], joelho: [35, 32], pe: [38, 22],
    apoios: [{ tipo: 'banco', de: [9, 35], para: [33, 35], pe: 43 }],
    cotovelo: [16, 36], mao: [12, 37],
    carga: 'pe',
  },
  panturrilha: {
    cabeca: [24, 11], peito: [24, 18], quadril: [24, 28], joelho: [24, 35], pe: [24, 38],
    cotovelo: [24, 23], mao: [24, 30],
    // Pé em ponta sobre o degrau e calcanhar no ar — é o que diferencia a
    // panturrilha de qualquer outra figura em pé.
    extras: [{ tipo: 'arco', d: 'M18 35 L24 38 L29 42' }],
    apoios: [{ tipo: 'linha', de: [26, 43], para: [40, 43] }],
  },
  rosca: {
    cabeca: [24, 12], peito: [24, 19], quadril: [24, 29], joelho: [24, 37], pe: [24, 44],
    cotovelo: [23, 26], mao: [31, 22],
  },
  'rosca-punho': {
    cabeca: [24, 12], peito: [24, 19], quadril: [24, 29], joelho: [24, 37], pe: [24, 44],
    cotovelo: [23, 26], mao: [32, 28],
    extras: [{ tipo: 'linha', de: [23, 26], para: [32, 28], fraco: true }],
  },
  triceps: {
    cabeca: [24, 12], peito: [24, 19], quadril: [24, 29], joelho: [24, 37], pe: [24, 44],
    cotovelo: [23, 25], mao: [26, 33],
    extras: [{ tipo: 'arco', d: 'M20 25 L26 25', fraco: true }],
  },
  'triceps-testa': {
    cabeca: [13, 27], peito: [19, 29], quadril: [30, 30], joelho: [37, 33], pe: [40, 42],
    cotovelo: [19, 21], mao: [14, 23],
    apoios: [{ tipo: 'banco', de: [10, 33], para: [33, 33], pe: 42 }],
  },
  'triceps-frances': {
    cabeca: [24, 13], peito: [24, 20], quadril: [24, 30], joelho: [24, 37], pe: [24, 44],
    cotovelo: [24, 10], mao: [31, 15],
  },
  abdominal: {
    cabeca: [36, 28], peito: [32, 32], quadril: [22, 37], joelho: [15, 31], pe: [9, 38],
    cotovelo: [36, 33], mao: [39, 28],
    apoios: [{ tipo: 'linha', de: [6, 41], para: [42, 41] }],
    carga: 'nenhum',
  },
  prancha: {
    cabeca: [11, 26], peito: [16, 28], quadril: [29, 33], joelho: [36, 36], pe: [43, 39],
    cotovelo: [16, 36], mao: [10, 36],
    apoios: [{ tipo: 'linha', de: [6, 40], para: [44, 40] }],
    carga: 'nenhum',
  },
  encolhimento: {
    cabeca: [24, 12], peito: [24, 18], quadril: [24, 29], joelho: [24, 37], pe: [24, 44],
    cotovelo: [24, 25], mao: [24, 32],
    extras: [
      { tipo: 'arco', d: 'M17 22 L17 14 M14 17 L17 14 L20 17' },
      { tipo: 'arco', d: 'M31 22 L31 14 M28 17 L31 14 L34 17' },
    ],
  },
  ponte: {
    cabeca: [10, 24], peito: [15, 27], quadril: [27, 29], joelho: [35, 31], pe: [36, 42],
    cotovelo: [15, 33], mao: [11, 35],
    apoios: [
      { tipo: 'banco', de: [7, 29], para: [18, 29], pe: 42 },
      { tipo: 'linha', de: [24, 43], para: [42, 43] },
    ],
    carga: 'ombro',
  },
  coice: {
    cabeca: [9, 24], peito: [15, 26], quadril: [28, 27], joelho: [36, 24], pe: [43, 21],
    cotovelo: [15, 32], mao: [14, 38],
    joelho2: [29, 34], pe2: [26, 39],
    apoios: [{ tipo: 'linha', de: [6, 40], para: [42, 40] }],
    carga: 'pe',
  },
  swing: {
    cabeca: [17, 15], peito: [20, 21], quadril: [30, 27], joelho: [27, 35], pe: [27, 44],
    cotovelo: [20, 27], mao: [13, 30],
  },
  olimpico: {
    cabeca: [22, 12], peito: [23, 19], quadril: [26, 28], joelho: [22, 35], pe: [25, 43],
    cotovelo: [17, 23], mao: [23, 24],
  },
  carregado: {
    cabeca: [23, 12], peito: [24, 19], quadril: [25, 29], joelho: [21, 36], pe: [18, 43],
    cotovelo: [24, 25], mao: [24, 32],
    joelho2: [30, 36], pe2: [33, 42],
  },
  corrida: {
    cabeca: [26, 11], peito: [24, 18], quadril: [23, 27], joelho: [30, 32], pe: [33, 40],
    cotovelo: [29, 22], mao: [32, 17],
    cotovelo2: [19, 22], mao2: [16, 27],
    joelho2: [16, 32], pe2: [12, 28],
    carga: 'nenhum',
  },
  bike: {
    cabeca: [17, 15], peito: [21, 20], quadril: [29, 25], joelho: [26, 32], pe: [30, 36],
    cotovelo: [17, 22], mao: [13, 24],
    joelho2: [31, 31], pe2: [34, 34],
    extras: [
      { tipo: 'circulo', c: [32, 36], r: 6 },
      { tipo: 'linha', de: [13, 26], para: [13, 42], fraco: true },
      { tipo: 'linha', de: [29, 25], para: [32, 36], fraco: true },
      { tipo: 'linha', de: [13, 42], para: [32, 42], fraco: true },
    ],
    carga: 'nenhum',
  },
  remo: {
    cabeca: [14, 20], peito: [19, 23], quadril: [29, 27], joelho: [23, 33], pe: [14, 36],
    cotovelo: [21, 29], mao: [16, 27],
    apoios: [{ tipo: 'linha', de: [8, 40], para: [42, 40] }],
    extras: [{ tipo: 'linha', de: [16, 27], para: [40, 24] }],
    carga: 'nenhum',
  },
  corda: {
    cabeca: [24, 13], peito: [24, 20], quadril: [24, 29], joelho: [24, 35], pe: [24, 40],
    cotovelo: [18, 24], mao: [15, 28],
    cotovelo2: [30, 24], mao2: [33, 28],
    extras: [{ tipo: 'arco', d: 'M15 28 Q24 48 33 28' }],
    apoios: [{ tipo: 'linha', de: [10, 43], para: [38, 43] }],
    carga: 'nenhum',
  },
  natacao: {
    cabeca: [16, 24], peito: [22, 26], quadril: [34, 28], joelho: [40, 30], pe: [45, 27],
    cotovelo: [16, 19], mao: [10, 21],
    extras: [
      { tipo: 'arco', d: 'M3 34 Q10 31 17 34 T31 34 T45 34', fraco: true },
      { tipo: 'arco', d: 'M3 39 Q10 36 17 39 T31 39 T45 39', fraco: true },
    ],
    carga: 'nenhum',
  },
}
