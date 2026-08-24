import { EXERCICIOS } from './data/exercicios'
import { FiguraExercicio } from './components/FiguraExercicio'
import { poseDoExercicio } from './lib/figuras'

const EQUIPAMENTOS = ['barra', 'halter', 'polia', 'maquina', 'smith', 'peso-corporal', 'kettlebell', 'elastico'] as const

export default function FolhaFiguras() {
  const porPose = new Map<string, (typeof EXERCICIOS)[number]>()
  for (const e of EXERCICIOS) {
    const p = poseDoExercicio(e)
    if (!porPose.has(p)) porPose.set(p, e)
  }
  return (
    <div className="p-4 text-slate-200">
      <h1 className="mb-4 text-lg font-bold">Poses ({porPose.size})</h1>
      <div className="grid grid-cols-6 gap-3">
        {[...porPose].map(([pose, ex]) => (
          <div key={pose} className="rounded-lg bg-white/[0.04] p-2 text-center">
            <FiguraExercicio exercicio={ex} tamanho={72} className="mx-auto text-slate-200" />
            <p className="mt-1 text-[10px] leading-tight text-slate-400">{pose}</p>
            <p className="text-[9px] leading-tight text-slate-600">{ex.nome}</p>
          </div>
        ))}
      </div>
      <h1 className="mb-4 mt-8 text-lg font-bold">Equipamentos no mesmo movimento</h1>
      <div className="grid grid-cols-8 gap-3">
        {EQUIPAMENTOS.map((eq) => (
          <div key={eq} className="rounded-lg bg-white/[0.04] p-2 text-center">
            <FiguraExercicio exercicio={{ id: 'agachamento-livre', grupo: 'Quadríceps', equipamento: eq }} tamanho={72} className="mx-auto" />
            <p className="mt-1 text-[10px] text-slate-400">{eq}</p>
          </div>
        ))}
        {EQUIPAMENTOS.map((eq) => (
          <div key={'r' + eq} className="rounded-lg bg-white/[0.04] p-2 text-center">
            <FiguraExercicio exercicio={{ id: 'rosca-direta-barra', grupo: 'Bíceps', equipamento: eq }} tamanho={72} className="mx-auto" />
            <p className="mt-1 text-[10px] text-slate-400">rosca {eq}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
