import { X } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useEffect } from 'react'

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}

// -------------------------------- Cartão -----------------------------------

export function Cartao({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={cx('cartao p-4', onClick && 'cursor-pointer transition hover:border-white/15', className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function TituloSecao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">{children}</h2>
      {acao}
    </div>
  )
}

// -------------------------------- Botão ------------------------------------

type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo'

const VARIANTES: Record<VarianteBotao, string> = {
  primario: 'bg-lime text-ink-950 hover:bg-lime-soft active:scale-[0.98] font-semibold',
  secundario: 'bg-ink-700 text-slate-100 hover:bg-ink-600 active:scale-[0.98]',
  fantasma: 'bg-transparent text-slate-300 hover:bg-white/5 border border-white/10',
  perigo: 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/25',
}

export function Botao({
  children,
  variante = 'primario',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[15px] transition',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        VARIANTES[variante],
        className,
      )}
    >
      {children}
    </button>
  )
}

// -------------------------------- Campos -----------------------------------

export function Campo({
  rotulo,
  sufixo,
  dica,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { rotulo?: string; sufixo?: string; dica?: string }) {
  return (
    <label className="block">
      {rotulo && <span className="rotulo">{rotulo}</span>}
      <div className="relative">
        <input {...props} className={cx('campo', sufixo && 'pr-12', className)} />
        {sufixo && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            {sufixo}
          </span>
        )}
      </div>
      {dica && <span className="mt-1 block text-xs text-slate-500">{dica}</span>}
    </label>
  )
}

export function Selecao({
  rotulo,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { rotulo?: string }) {
  return (
    <label className="block">
      {rotulo && <span className="rotulo">{rotulo}</span>}
      <select {...props} className={cx('campo appearance-none', className)}>
        {children}
      </select>
    </label>
  )
}

// -------------------------------- Chips ------------------------------------

export function Chip({
  ativo,
  children,
  onClick,
  cor,
}: {
  ativo?: boolean
  children: ReactNode
  onClick?: () => void
  cor?: string
}) {
  return (
    <button
      onClick={onClick}
      style={ativo && cor ? { backgroundColor: `${cor}22`, borderColor: `${cor}66`, color: cor } : undefined}
      className={cx(
        'whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] transition',
        ativo && !cor
          ? 'border-lime/50 bg-lime/15 text-lime'
          : !ativo && 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200',
      )}
    >
      {children}
    </button>
  )
}

export function Etiqueta({ children, cor }: { children: ReactNode; cor: string }) {
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: `${cor}1f`, color: cor }}
    >
      {children}
    </span>
  )
}

// ------------------------------- Progresso ---------------------------------

export function Barra({ valor, meta, cor = '#c6f24e' }: { valor: number; meta: number; cor?: string }) {
  const pct = meta > 0 ? Math.min(100, (valor / meta) * 100) : 0
  const excedeu = meta > 0 && valor > meta
  return (
    <div className="barra">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(pct, valor > 0 ? 3 : 0)}%`, backgroundColor: excedeu ? '#ff7a45' : cor }}
      />
    </div>
  )
}

export function Anel({
  valor,
  meta,
  tamanho = 132,
  espessura = 11,
  cor = '#c6f24e',
  children,
}: {
  valor: number
  meta: number
  tamanho?: number
  espessura?: number
  cor?: string
  children?: ReactNode
}) {
  const raio = (tamanho - espessura) / 2
  const circ = 2 * Math.PI * raio
  const pct = meta > 0 ? Math.min(1, valor / meta) : 0
  const excedeu = meta > 0 && valor > meta

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={espessura}
        />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={excedeu ? '#ff7a45' : cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

// -------------------------------- Painel -----------------------------------

/** Painel deslizante de baixo — o padrão de modal que funciona no celular. */
export function Painel({
  aberto,
  aoFechar,
  titulo,
  children,
  altura = 'max-h-[88vh]',
}: {
  aberto: boolean
  aoFechar: () => void
  titulo?: string
  children: ReactNode
  altura?: string
}) {
  useEffect(() => {
    if (!aberto) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', onEsc)
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={aoFechar} />
      <div
        className={cx(
          'relative w-full animate-slideUp overflow-hidden rounded-t-3xl border border-white/10 bg-ink-900',
          'sm:max-w-lg sm:rounded-3xl',
          altura,
        )}
      >
        {titulo && (
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
            <h3 className="font-semibold">{titulo}</h3>
            <button onClick={aoFechar} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
              <X size={18} />
            </button>
          </div>
        )}
        <div className={cx('overflow-y-auto px-5 py-4', titulo ? 'max-h-[calc(88vh-56px)]' : altura)}>{children}</div>
      </div>
    </div>
  )
}

// -------------------------------- Estados ----------------------------------

export function Vazio({ icone, titulo, texto, acao }: { icone: ReactNode; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 text-slate-600">{icone}</div>
      <p className="font-medium text-slate-300">{titulo}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{texto}</p>
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

export function Aviso({ tom, children }: { tom: 'ok' | 'atencao' | 'alerta' | 'info'; children: ReactNode }) {
  const estilos = {
    ok: 'border-lime/25 bg-lime/[0.07] text-lime-soft',
    atencao: 'border-amber-400/25 bg-amber-400/[0.07] text-amber-200',
    alerta: 'border-flame/30 bg-flame/[0.08] text-orange-200',
    info: 'border-sky2/25 bg-sky2/[0.07] text-sky-200',
  }[tom]
  return <div className={cx('rounded-xl border px-3.5 py-3 text-sm leading-relaxed', estilos)}>{children}</div>
}

export function Carregando({ texto }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-lime border-t-transparent" />
      {texto ?? 'Carregando…'}
    </div>
  )
}

export function Estatistica({ rotulo, valor, sufixo, cor }: { rotulo: string; valor: ReactNode; sufixo?: string; cor?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums" style={cor ? { color: cor } : undefined}>
        {valor}
        {sufixo && <span className="ml-0.5 text-xs font-normal text-slate-500">{sufixo}</span>}
      </p>
    </div>
  )
}
