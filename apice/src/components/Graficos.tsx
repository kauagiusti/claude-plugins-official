import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// ---------------------------------------------------------------------------
// Paleta dos gráficos.
//
// São passos próprios, mais escuros que os tokens de UI da marca: sobre a
// superfície #12151c todos ficam dentro da banda de luminosidade do modo
// escuro (OKLCH L 0.48–0.67) e passam nas checagens de croma, separação para
// daltonismo e contraste. Os tons vivos (#c6f24e etc.) continuam valendo para
// texto e componentes — aqui eles sairiam claros demais.
// ---------------------------------------------------------------------------

export const COR_GRAFICO = {
  lime: '#789e28',
  sky: '#2b8fc4',
  flame: '#d1552a',
  grape: '#7c5cd6',
} as const

const EIXO = { fill: '#64748b', fontSize: 10 }
const GRADE = 'rgba(255,255,255,0.05)'

function Dica({
  active,
  payload,
  label,
  unidade,
  formatar,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string | number
  unidade: string
  formatar?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/95 px-2.5 py-1.5 shadow-xl">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-slate-100">
        {formatar ? formatar(v) : v.toLocaleString('pt-BR')}
        <span className="ml-1 text-[10px] font-normal text-slate-500">{unidade}</span>
      </p>
    </div>
  )
}

/** Envelope comum: título, valor de destaque e a área do gráfico. */
function Moldura({
  titulo,
  destaque,
  sufixo,
  legenda,
  children,
}: {
  titulo: string
  destaque?: string
  sufixo?: string
  legenda?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-[13px] font-medium text-slate-300">{titulo}</h3>
        {destaque && (
          <span className="text-sm font-semibold tabular-nums text-slate-100">
            {destaque}
            {sufixo && <span className="ml-0.5 text-[10px] font-normal text-slate-500">{sufixo}</span>}
          </span>
        )}
      </div>
      {legenda && <p className="mb-2 text-[11px] text-slate-500">{legenda}</p>}
      <div className="h-36">{children}</div>
    </div>
  )
}

// ------------------------------ Peso corporal ------------------------------

export function GraficoPeso({ dados }: { dados: { rotulo: string; peso: number }[] }) {
  if (dados.length < 2) return null
  const pesos = dados.map((d) => d.peso)
  const min = Math.floor(Math.min(...pesos) - 1)
  const max = Math.ceil(Math.max(...pesos) + 1)
  const delta = pesos[pesos.length - 1] - pesos[0]

  return (
    <Moldura
      titulo="Peso corporal"
      destaque={pesos[pesos.length - 1].toFixed(1)}
      sufixo="kg"
      legenda={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg desde o primeiro registro`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
          <defs>
            <linearGradient id="grad-peso" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR_GRAFICO.sky} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COR_GRAFICO.sky} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRADE} vertical={false} />
          <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={false} minTickGap={14} />
          <YAxis domain={[min, max]} tick={EIXO} tickLine={false} axisLine={false} width={42} />
          <Tooltip content={<Dica unidade="kg" formatar={(v) => v.toFixed(1)} />} cursor={{ stroke: GRADE }} />
          <Area
            type="monotone"
            dataKey="peso"
            stroke={COR_GRAFICO.sky}
            strokeWidth={2}
            fill="url(#grad-peso)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#12151c' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Moldura>
  )
}

// ----------------------------- Volume semanal ------------------------------

export function GraficoVolume({ dados }: { dados: { rotulo: string; volume: number }[] }) {
  if (dados.every((d) => d.volume === 0)) return null
  const atual = dados[dados.length - 1]?.volume ?? 0

  return (
    <Moldura
      titulo="Volume semanal"
      destaque={atual >= 1000 ? (atual / 1000).toFixed(1) : String(Math.round(atual))}
      sufixo={atual >= 1000 ? 't' : 'kg'}
      legenda="Carga × repetições somadas na semana"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
          <CartesianGrid stroke={GRADE} vertical={false} />
          <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={false} />
          <YAxis
            tick={EIXO}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v < 10000 ? 1 : 0)}t` : String(v))}
          />
          <Tooltip
            content={<Dica unidade="kg" formatar={(v) => Math.round(v).toLocaleString('pt-BR')} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          {/* Cantos arredondados só no topo — a base fica ancorada no eixo. */}
          <Bar dataKey="volume" fill={COR_GRAFICO.lime} radius={[4, 4, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </Moldura>
  )
}

// --------------------------- Calorias por dia ------------------------------

export function GraficoCalorias({
  dados,
  meta,
}: {
  dados: { rotulo: string; kcal: number }[]
  meta: number
}) {
  if (dados.every((d) => d.kcal === 0)) return null
  const comRegistro = dados.filter((d) => d.kcal > 0)
  const media = comRegistro.length
    ? comRegistro.reduce((a, d) => a + d.kcal, 0) / comRegistro.length
    : 0

  return (
    <Moldura
      titulo="Calorias por dia"
      destaque={Math.round(media).toLocaleString('pt-BR')}
      sufixo="kcal/dia"
      legenda={`Média dos dias registrados · linha tracejada = meta de ${meta.toLocaleString('pt-BR')} kcal`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
          <CartesianGrid stroke={GRADE} vertical={false} />
          <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={false} />
          <YAxis
            tick={EIXO}
            tickLine={false}
            axisLine={false}
            width={42}
            domain={[0, (max: number) => Math.ceil(Math.max(max, meta) * 1.08)]}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
          />
          <Tooltip
            content={<Dica unidade="kcal" formatar={(v) => Math.round(v).toLocaleString('pt-BR')} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <ReferenceLine y={meta} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} />
          <Bar dataKey="kcal" radius={[4, 4, 0, 0]} maxBarSize={26}>
            {/* Estourar a meta é uma mudança de estado, não outra série:
                mesma barra, cor de alerta. */}
            {dados.map((d, i) => (
              <Cell key={i} fill={d.kcal > meta ? COR_GRAFICO.flame : COR_GRAFICO.lime} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Moldura>
  )
}
