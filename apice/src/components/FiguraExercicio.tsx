import { memo } from 'react'
import { POSES, poseDoExercicio, type P } from '../lib/figuras'
import type { Equipamento, Exercicio } from '../types'

// ---------------------------------------------------------------------------
// Desenho do exercício.
//
// Um boneco de traço, de perfil, num quadro de 48×48. A pose é um conjunto de
// articulações; o desenho sai de ligar os pontos. O equipamento entra depois,
// posicionado pela mão — é o que faz o mesmo agachamento virar livre, frontal
// ou no Smith sem redesenhar nada.
//
// De perfil e sem detalhe de propósito: em 40 px de lista, rosto e músculo
// viram borrão. O que precisa ler à primeira vista é o ângulo do tronco, onde
// está a carga e para onde ela vai.
// ---------------------------------------------------------------------------

// ------------------------------ Equipamento --------------------------------

const CARGA = '#c6f24e'

/**
 * O equipamento nas mãos (ou nos ombros, ou sob os pés). Recebe o ponto em que
 * a carga fica e devolve os traços — barra atravessa, halter fica curto, cabo
 * sobe até a polia.
 */
function Equipamento({ tipo, em, ancora, angulo = 0 }: { tipo: Equipamento; em: P; ancora?: P; angulo?: number }) {
  const [x, y] = em
  const traco = { stroke: CARGA, strokeWidth: 2.2, strokeLinecap: 'round' as const, fill: 'none' }

  switch (tipo) {
    case 'barra':
      return (
        <g transform={`rotate(${angulo} ${x} ${y})`}>
          <line x1={x - 11} y1={y} x2={x + 11} y2={y} {...traco} />
          <line x1={x - 9} y1={y - 3.5} x2={x - 9} y2={y + 3.5} {...traco} />
          <line x1={x + 9} y1={y - 3.5} x2={x + 9} y2={y + 3.5} {...traco} />
        </g>
      )
    case 'halter':
      return (
        <g transform={`rotate(${angulo} ${x} ${y})`}>
          <line x1={x - 4} y1={y} x2={x + 4} y2={y} {...traco} />
          <line x1={x - 4} y1={y - 3} x2={x - 4} y2={y + 3} {...traco} />
          <line x1={x + 4} y1={y - 3} x2={x + 4} y2={y + 3} {...traco} />
        </g>
      )
    case 'kettlebell':
      return (
        <g>
          <circle cx={x} cy={y + 2.5} r={3.4} {...traco} />
          <path d={`M${x - 2} ${y} q2 -3.4 4 0`} {...traco} />
        </g>
      )
    case 'smith':
      return (
        <g>
          <line x1={9} y1={5} x2={9} y2={44} {...traco} strokeWidth={1.4} opacity={0.55} />
          <line x1={39} y1={5} x2={39} y2={44} {...traco} strokeWidth={1.4} opacity={0.55} />
          <line x1={x - 12} y1={y} x2={x + 12} y2={y} {...traco} />
        </g>
      )
    case 'polia': {
      const [ax, ay] = ancora ?? [42, 8]
      return (
        <g>
          <circle cx={ax} cy={ay} r={2.4} {...traco} strokeWidth={1.8} />
          <line x1={ax} y1={ay + 2.4} x2={x} y2={y} {...traco} strokeWidth={1.4} />
          <line x1={x - 3.5} y1={y - 2} x2={x + 3.5} y2={y + 2} {...traco} />
        </g>
      )
    }
    case 'elastico': {
      const [ax, ay] = ancora ?? [42, 40]
      const mx = (x + ax) / 2
      const my = (y + ay) / 2
      return (
        <path
          d={`M${x} ${y} Q${mx + 4} ${my - 4} ${ax} ${ay}`}
          {...traco}
          strokeWidth={1.8}
          strokeDasharray="3 2.5"
        />
      )
    }
    case 'maquina':
      return (
        <g opacity={0.75}>
          <rect x={38} y={12} width={7} height={26} rx={1.5} {...traco} strokeWidth={1.6} />
          <line x1={38} y1={20} x2={45} y2={20} {...traco} strokeWidth={1.2} />
          <line x1={38} y1={26} x2={45} y2={26} {...traco} strokeWidth={1.2} />
          <line x1={38} y1={32} x2={45} y2={32} {...traco} strokeWidth={1.2} />
        </g>
      )
    default:
      return null
  }
}

// ------------------------------- Renderizador -------------------------------

const CORPO = 'currentColor'

function Membro({ a, b, c, fraco }: { a: P; b: P; c: P; fraco?: boolean }) {
  return (
    <polyline
      points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}`}
      fill="none"
      stroke={CORPO}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={fraco ? 0.35 : 1}
    />
  )
}

export const FiguraExercicio = memo(function FiguraExercicio({
  exercicio,
  tamanho = 40,
  className,
}: {
  exercicio: Pick<Exercicio, 'id' | 'grupo' | 'equipamento'>
  tamanho?: number
  className?: string
}) {
  const pose = POSES[poseDoExercicio(exercicio)]
  const equipamento = exercicio.equipamento
  const onde = pose.carga ?? 'mao'

  // Cardio e peso corporal não têm carga para desenhar; máquina e Smith são
  // estrutura, não algo que a mão segura.
  const mostraCarga = onde !== 'nenhum' && equipamento !== 'peso-corporal' && equipamento !== 'cardio'
  const pontoDaCarga: P =
    onde === 'ombro' ? pose.mao : onde === 'pe' ? pose.pe : pose.mao

  return (
    <svg
      viewBox="0 0 48 48"
      width={tamanho}
      height={tamanho}
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {/* apoios primeiro: ficam atrás do corpo */}
      {pose.apoios?.map((a, i) =>
        a.tipo === 'banco' ? (
          <g key={i} stroke={CORPO} strokeWidth={1.6} strokeLinecap="round" opacity={0.3}>
            <line x1={a.de[0]} y1={a.de[1]} x2={a.para[0]} y2={a.para[1]} />
            <line x1={a.de[0] + 3} y1={a.de[1]} x2={a.de[0] + 3} y2={a.pe ?? 42} />
            <line x1={a.para[0] - 3} y1={a.para[1]} x2={a.para[0] - 3} y2={a.pe ?? 42} />
          </g>
        ) : (
          <line
            key={i}
            x1={a.de[0]}
            y1={a.de[1]}
            x2={a.para[0]}
            y2={a.para[1]}
            stroke={CORPO}
            strokeWidth={1.6}
            strokeLinecap="round"
            opacity={0.3}
          />
        ),
      )}

      {pose.extras?.map((e, i) =>
        e.tipo === 'circulo' ? (
          <circle
            key={i}
            cx={e.c[0]}
            cy={e.c[1]}
            r={e.r}
            fill="none"
            stroke={CORPO}
            strokeWidth={1.6}
            opacity={e.fraco ? 0.3 : 0.55}
          />
        ) : e.tipo === 'arco' ? (
          <path
            key={i}
            d={e.d}
            fill="none"
            stroke={CORPO}
            strokeWidth={1.6}
            strokeLinecap="round"
            opacity={e.fraco ? 0.3 : 0.55}
          />
        ) : (
          <line
            key={i}
            x1={e.de[0]}
            y1={e.de[1]}
            x2={e.para[0]}
            y2={e.para[1]}
            stroke={CORPO}
            strokeWidth={1.6}
            strokeLinecap="round"
            opacity={e.fraco ? 0.3 : 0.55}
          />
        ),
      )}

      {/* membros do fundo */}
      {pose.joelho2 && pose.pe2 && <Membro a={pose.quadril} b={pose.joelho2} c={pose.pe2} fraco />}
      {pose.cotovelo2 && pose.mao2 && <Membro a={pose.peito} b={pose.cotovelo2} c={pose.mao2} fraco />}

      {/* tronco e cabeça */}
      <line
        x1={pose.peito[0]}
        y1={pose.peito[1]}
        x2={pose.quadril[0]}
        y2={pose.quadril[1]}
        stroke={CORPO}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      <line
        x1={pose.cabeca[0]}
        y1={pose.cabeca[1]}
        x2={pose.peito[0]}
        y2={pose.peito[1]}
        stroke={CORPO}
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.8}
      />
      <circle cx={pose.cabeca[0]} cy={pose.cabeca[1]} r={3.6} fill={CORPO} />

      {/* membros da frente */}
      <Membro a={pose.quadril} b={pose.joelho} c={pose.pe} />
      <Membro a={pose.peito} b={pose.cotovelo} c={pose.mao} />

      {/* Halter e kettlebell vêm aos pares. Sem isto a mão de trás aparece
          vazia e o desenho fica torto — barra e cabo não têm o problema,
          porque atravessam as duas mãos. */}
      {mostraCarga && pose.mao2 && onde === 'mao' && (equipamento === 'halter' || equipamento === 'kettlebell') && (
        <g opacity={0.4}>
          <Equipamento tipo={equipamento} em={pose.mao2} ancora={pose.ancora} />
        </g>
      )}

      {mostraCarga && <Equipamento tipo={equipamento} em={pontoDaCarga} ancora={pose.ancora} />}
    </svg>
  )
})
