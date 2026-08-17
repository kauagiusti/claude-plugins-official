import type { LiftReferencia, NivelForca, Sexo } from '../types'

// ---------------------------------------------------------------------------
// Padrões de força por peso corporal.
//
// Cada linha é [pesoCorporalKg, iniciante, novato, intermediário, avançado,
// elite] em kg de 1RM. Os valores seguem a distribuição usada pelas grandes
// bases públicas de levantamentos (ordem de milhões de registros de praticantes
// que reportam suas cargas), arredondados. Entre linhas o valor é interpolado
// linearmente; fora da tabela, extrapolado pela borda.
//
// São ESTIMATIVAS de população treinada, não medições clínicas — servem para
// comparação e motivação, não para prescrição.
// ---------------------------------------------------------------------------

export const NIVEIS: NivelForca[] = ['Iniciante', 'Novato', 'Intermediário', 'Avançado', 'Elite']

/** Percentil aproximado da população treinada em cada limiar. */
export const PERCENTIL_NIVEL: Record<NivelForca, number> = {
  Iniciante: 5,
  Novato: 20,
  Intermediário: 50,
  Avançado: 80,
  Elite: 95,
}

export const CORES_NIVEL: Record<NivelForca, string> = {
  Iniciante: '#94a3b8',
  Novato: '#4ec3f2',
  Intermediário: '#c6f24e',
  Avançado: '#ff7a45',
  Elite: '#a78bfa',
}

type Linha = [number, number, number, number, number, number]

const TABELAS: Record<LiftReferencia, Record<Sexo, Linha[]>> = {
  supino: {
    M: [
      [60, 34, 50, 70, 95, 122],
      [70, 41, 59, 81, 107, 136],
      [80, 48, 67, 90, 118, 148],
      [90, 54, 74, 99, 128, 159],
      [100, 60, 81, 107, 137, 169],
      [110, 65, 88, 114, 145, 178],
      [120, 70, 94, 121, 153, 187],
    ],
    F: [
      [45, 14, 23, 35, 50, 68],
      [55, 18, 28, 41, 58, 77],
      [65, 22, 33, 47, 65, 85],
      [75, 26, 37, 53, 71, 92],
      [85, 29, 41, 58, 77, 99],
      [95, 32, 45, 62, 82, 105],
    ],
  },
  agachamento: {
    M: [
      [60, 44, 65, 91, 120, 152],
      [70, 54, 77, 105, 137, 171],
      [80, 63, 88, 118, 152, 188],
      [90, 72, 99, 130, 166, 204],
      [100, 80, 108, 141, 179, 218],
      [110, 88, 117, 152, 191, 231],
      [120, 95, 126, 161, 202, 244],
    ],
    F: [
      [45, 19, 33, 51, 74, 100],
      [55, 25, 41, 61, 86, 114],
      [65, 31, 48, 70, 97, 126],
      [75, 36, 55, 78, 106, 137],
      [85, 41, 61, 85, 115, 147],
      [95, 46, 67, 92, 123, 156],
    ],
  },
  terra: {
    M: [
      [60, 57, 82, 111, 144, 179],
      [70, 69, 96, 128, 163, 201],
      [80, 80, 109, 143, 180, 220],
      [90, 90, 121, 156, 195, 237],
      [100, 100, 132, 169, 209, 252],
      [110, 109, 142, 180, 221, 266],
      [120, 117, 152, 191, 233, 279],
    ],
    F: [
      [45, 25, 42, 63, 89, 118],
      [55, 32, 51, 75, 103, 134],
      [65, 39, 60, 85, 115, 148],
      [75, 46, 68, 95, 126, 161],
      [85, 52, 76, 104, 137, 173],
      [95, 58, 83, 112, 146, 184],
    ],
  },
  desenvolvimento: {
    M: [
      [60, 23, 34, 48, 65, 84],
      [70, 28, 40, 55, 74, 94],
      [80, 32, 46, 62, 82, 103],
      [90, 37, 51, 68, 89, 111],
      [100, 41, 56, 74, 96, 118],
      [110, 45, 61, 79, 102, 125],
      [120, 48, 65, 84, 108, 131],
    ],
    F: [
      [45, 9, 15, 24, 35, 48],
      [55, 11, 19, 29, 41, 55],
      [65, 14, 22, 33, 46, 61],
      [75, 16, 25, 37, 51, 66],
      [85, 19, 28, 40, 55, 71],
      [95, 21, 31, 44, 59, 75],
    ],
  },
  remada: {
    M: [
      [60, 33, 48, 66, 88, 111],
      [70, 40, 56, 76, 99, 124],
      [80, 46, 64, 85, 110, 136],
      [90, 52, 71, 93, 119, 146],
      [100, 58, 78, 101, 128, 156],
      [110, 63, 84, 108, 136, 165],
      [120, 68, 90, 115, 143, 173],
    ],
    F: [
      [45, 14, 22, 33, 46, 62],
      [55, 17, 27, 39, 54, 70],
      [65, 21, 31, 44, 60, 78],
      [75, 24, 35, 49, 66, 84],
      [85, 27, 39, 54, 71, 90],
      [95, 30, 42, 58, 76, 96],
    ],
  },
  // Barra fixa e paralelas são avaliadas pela carga TOTAL do sistema
  // (peso corporal + carga extra), por isso os números já embutem o corpo.
  'barra-fixa': {
    M: [
      [60, 47, 63, 82, 103, 126],
      [70, 55, 73, 94, 118, 143],
      [80, 63, 82, 105, 131, 158],
      [90, 70, 91, 116, 143, 172],
      [100, 77, 100, 126, 155, 186],
      [110, 84, 108, 135, 166, 198],
      [120, 90, 115, 144, 176, 210],
    ],
    F: [
      [45, 30, 41, 55, 71, 89],
      [55, 37, 50, 65, 83, 102],
      [65, 44, 58, 74, 94, 115],
      [75, 50, 65, 83, 104, 126],
      [85, 56, 72, 91, 113, 136],
      [95, 61, 79, 99, 122, 146],
    ],
  },
  paralelas: {
    M: [
      [60, 55, 72, 92, 115, 139],
      [70, 64, 83, 105, 130, 157],
      [80, 73, 93, 117, 144, 173],
      [90, 81, 103, 128, 157, 187],
      [100, 89, 112, 139, 169, 201],
      [110, 96, 121, 148, 180, 213],
      [120, 103, 129, 158, 191, 225],
    ],
    F: [
      [45, 39, 51, 66, 84, 103],
      [55, 47, 61, 77, 97, 118],
      [65, 55, 70, 88, 109, 132],
      [75, 62, 78, 97, 120, 144],
      [85, 68, 86, 106, 130, 155],
      [95, 75, 93, 114, 139, 166],
    ],
  },
}

export const NOME_LIFT: Record<LiftReferencia, string> = {
  supino: 'Supino reto',
  agachamento: 'Agachamento livre',
  terra: 'Levantamento terra',
  desenvolvimento: 'Desenvolvimento militar',
  remada: 'Remada curvada',
  'barra-fixa': 'Barra fixa',
  paralelas: 'Paralelas',
}

/** Lifts destacados no ranking geral. */
export const LIFTS_PRINCIPAIS: LiftReferencia[] = ['agachamento', 'supino', 'terra', 'desenvolvimento', 'remada']

/**
 * Limiares de 1RM (kg) para cada nível, no lift indicado, interpolados pelo
 * peso corporal.
 */
export function limiaresPorPeso(lift: LiftReferencia, sexo: Sexo, pesoKg: number): Record<NivelForca, number> {
  const linhas = TABELAS[lift][sexo]
  const primeira = linhas[0]
  const ultima = linhas[linhas.length - 1]

  let valores: number[]
  if (pesoKg <= primeira[0]) {
    // Abaixo da tabela: escala proporcional suave, sem cair a zero.
    const f = Math.max(0.55, pesoKg / primeira[0])
    valores = primeira.slice(1).map((v) => v * f)
  } else if (pesoKg >= ultima[0]) {
    const anterior = linhas[linhas.length - 2]
    const inclinacao = (ultima[0] - anterior[0]) || 1
    const extra = Math.min(pesoKg - ultima[0], 40) // ganho por peso satura
    valores = ultima.slice(1).map((v, i) => v + ((v - anterior[i + 1]) / inclinacao) * extra * 0.6)
  } else {
    let a = linhas[0]
    let b = linhas[1]
    for (let i = 0; i < linhas.length - 1; i++) {
      if (pesoKg >= linhas[i][0] && pesoKg <= linhas[i + 1][0]) {
        a = linhas[i]
        b = linhas[i + 1]
        break
      }
    }
    const t = (pesoKg - a[0]) / (b[0] - a[0])
    valores = a.slice(1).map((v, i) => v + (b[i + 1] - v) * t)
  }

  return {
    Iniciante: valores[0],
    Novato: valores[1],
    Intermediário: valores[2],
    Avançado: valores[3],
    Elite: valores[4],
  }
}

/**
 * Fator de correção por idade. 1.0 no pico (20–30 anos); abaixo de 18 e acima
 * de 30 os padrões esperados caem. Curva próxima aos coeficientes usados em
 * competições master.
 */
export function fatorIdade(idade: number): number {
  if (!Number.isFinite(idade) || idade <= 0) return 1
  if (idade < 18) return 0.82 + (idade - 12) * 0.03 // 12a ≈ 0.82 → 18a ≈ 1.0
  if (idade <= 30) return 1
  if (idade <= 40) return 1 - (idade - 30) * 0.006 // até 0.94
  if (idade <= 50) return 0.94 - (idade - 40) * 0.009 // até 0.85
  if (idade <= 60) return 0.85 - (idade - 50) * 0.011 // até 0.74
  if (idade <= 70) return 0.74 - (idade - 60) * 0.013 // até 0.61
  return Math.max(0.4, 0.61 - (idade - 70) * 0.014)
}
