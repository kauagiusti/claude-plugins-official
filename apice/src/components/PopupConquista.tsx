import { useEffect } from 'react'
import { CONQUISTAS_POR_ID, CORES_TIER_CONQUISTA } from '../lib/gamificacao'
import { useStore } from '../lib/store'

/** Aparece por cima de tudo quando uma conquista é desbloqueada. */
export function PopupConquista() {
  const novas = useStore((s) => s.novasConquistas)
  const limpar = useStore((s) => s.limparNovasConquistas)
  const atual = novas[0]

  useEffect(() => {
    if (!atual) return
    const t = setTimeout(limpar, 4200)
    return () => clearTimeout(t)
  }, [atual, limpar])

  if (!atual) return null
  const c = CONQUISTAS_POR_ID[atual]
  if (!c) return null
  const cor = CORES_TIER_CONQUISTA[c.tier]

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <button
        onClick={limpar}
        className="pointer-events-auto flex w-full max-w-sm animate-pop items-center gap-3.5 rounded-2xl
                   border bg-ink-850/95 px-4 py-3 text-left shadow-2xl backdrop-blur-md"
        style={{ borderColor: `${cor}55` }}
      >
        <span className="text-3xl">{c.icone}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: cor }}>
            Conquista desbloqueada
            {novas.length > 1 && ` · +${novas.length - 1}`}
          </p>
          <p className="truncate font-semibold">{c.nome}</p>
          <p className="truncate text-xs text-slate-400">{c.descricao}</p>
        </div>
      </button>
    </div>
  )
}
