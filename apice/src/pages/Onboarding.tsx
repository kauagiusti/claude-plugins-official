import { ArrowRight, Check, Flame } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Aviso, Botao, Campo, Cartao, Chip, Selecao } from '../components/ui'
import { calcularMetas, ROTULO_ATIVIDADE, ROTULO_OBJETIVO, tdee } from '../lib/nutricao'
import { PERFIL_PADRAO, useStore } from '../lib/store'
import type { NivelAtividade, Objetivo, Perfil } from '../types'

export default function Onboarding() {
  const [passo, setPasso] = useState(0)
  const [p, setP] = useState<Perfil>(PERFIL_PADRAO)
  const [chave, setChave] = useState('')

  const setPerfil = useStore((s) => s.setPerfil)
  const setApiKey = useStore((s) => s.setApiKey)
  const concluir = useStore((s) => s.concluirOnboarding)

  const metas = useMemo(() => calcularMetas(p), [p])
  const manutencao = useMemo(() => Math.round(tdee(p)), [p])

  function finalizar() {
    setPerfil(p)
    if (chave.trim()) setApiKey(chave)
    concluir()
  }

  const passos = [
    // ------------------------------- Boas-vindas -----------------------------
    <div key="intro" className="space-y-6">
      <div className="flex flex-col items-center pt-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-lime to-lime-soft">
          <Flame size={30} className="text-ink-950" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Ápice</h1>
        <p className="mt-2 max-w-sm text-slate-400">
          Fotografe a refeição e receba kcal e macros na hora. Registre a série e veja onde você está em relação ao
          resto do mundo.
        </p>
      </div>
      <div className="space-y-2.5">
        {[
          ['📸', 'Nutrição por foto', 'Uma foto vira lista de alimentos, porções e macros — editável.'],
          ['🏆', 'Força comparada', 'Cada série mostra seu nível e percentil por peso, sexo e idade.'],
          ['📈', 'Progressão real', 'PRs, volume semanal e sugestão de carga para a próxima sessão.'],
        ].map(([icone, titulo, texto]) => (
          <Cartao key={titulo} className="flex gap-3.5">
            <span className="text-xl">{icone}</span>
            <div>
              <p className="font-medium">{titulo}</p>
              <p className="mt-0.5 text-sm text-slate-400">{texto}</p>
            </div>
          </Cartao>
        ))}
      </div>
    </div>,

    // --------------------------------- Perfil --------------------------------
    <div key="perfil" className="space-y-4">
      <Cabecalho titulo="Seus dados" texto="Servem para calcular suas metas e comparar sua força com a faixa certa." />
      <Campo
        rotulo="Como te chamar"
        value={p.nome}
        placeholder="Seu nome"
        onChange={(e) => setP({ ...p, nome: e.target.value })}
      />
      <div>
        <span className="rotulo">Sexo biológico</span>
        <div className="flex gap-2">
          <Chip ativo={p.sexo === 'M'} onClick={() => setP({ ...p, sexo: 'M' })}>
            Masculino
          </Chip>
          <Chip ativo={p.sexo === 'F'} onClick={() => setP({ ...p, sexo: 'F' })}>
            Feminino
          </Chip>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          As tabelas de força e o cálculo metabólico são separados por sexo — por isso a pergunta.
        </p>
      </div>
      <Campo
        rotulo="Data de nascimento"
        type="date"
        value={p.nascimento}
        onChange={(e) => setP({ ...p, nascimento: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Campo
          rotulo="Altura"
          type="number"
          inputMode="numeric"
          sufixo="cm"
          value={p.alturaCm || ''}
          onChange={(e) => setP({ ...p, alturaCm: Number(e.target.value) })}
        />
        <Campo
          rotulo="Peso"
          type="number"
          inputMode="decimal"
          sufixo="kg"
          value={p.pesoKg || ''}
          onChange={(e) => setP({ ...p, pesoKg: Number(e.target.value) })}
        />
      </div>
      <Campo
        rotulo="Gordura corporal (opcional)"
        type="number"
        inputMode="decimal"
        sufixo="%"
        value={p.gorduraPct ?? ''}
        placeholder="deixe vazio se não souber"
        dica="Se você souber, o gasto energético fica mais preciso."
        onChange={(e) => setP({ ...p, gorduraPct: e.target.value ? Number(e.target.value) : undefined })}
      />
    </div>,

    // -------------------------------- Objetivo -------------------------------
    <div key="objetivo" className="space-y-4">
      <Cabecalho titulo="Rotina e objetivo" texto="Define quantas calorias e macros o app vai mirar por dia." />
      <Selecao
        rotulo="Nível de atividade"
        value={p.atividade}
        onChange={(e) => setP({ ...p, atividade: e.target.value as NivelAtividade })}
      >
        {Object.entries(ROTULO_ATIVIDADE).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Selecao>
      <div>
        <span className="rotulo">Objetivo</span>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ROTULO_OBJETIVO) as Objetivo[]).map((o) => (
            <button
              key={o}
              onClick={() => setP({ ...p, objetivo: o })}
              className={
                p.objetivo === o
                  ? 'rounded-xl border border-lime/50 bg-lime/15 px-3 py-3 text-sm font-medium text-lime'
                  : 'rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300 hover:border-white/20'
              }
            >
              {ROTULO_OBJETIVO[o]}
            </button>
          ))}
        </div>
      </div>

      <Cartao className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-400">Gasto estimado de manutenção</span>
          <span className="font-semibold tabular-nums">{manutencao} kcal</span>
        </div>
        <div className="h-px bg-white/[0.07]" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-400">Sua meta diária</span>
          <span className="text-xl font-bold tabular-nums text-lime">{metas.kcal} kcal</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ['Proteína', metas.proteina, '#4ec3f2'],
            ['Carbo', metas.carbo, '#c6f24e'],
            ['Gordura', metas.gordura, '#ff7a45'],
          ].map(([rot, val, cor]) => (
            <div key={rot as string} className="rounded-lg bg-white/[0.03] py-2">
              <p className="text-[11px] text-slate-500">{rot as string}</p>
              <p className="font-semibold tabular-nums" style={{ color: cor as string }}>
                {val as number} g
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">Dá para ajustar tudo isso depois, em Ajustes.</p>
      </Cartao>
    </div>,

    // ----------------------------- Chave da API ------------------------------
    <div key="chave" className="space-y-4">
      <Cabecalho
        titulo="Análise por foto"
        texto="A leitura da foto usa a Claude API e roda com a sua própria chave."
      />
      <Campo
        rotulo="Chave da Claude API (opcional)"
        type="password"
        value={chave}
        placeholder="sk-ant-..."
        autoComplete="off"
        onChange={(e) => setChave(e.target.value)}
        dica="Pegue em console.anthropic.com › API Keys."
      />
      <Aviso tom="info">
        A chave fica salva só neste aparelho e as chamadas vão direto do seu navegador para a Anthropic — nenhum
        servidor intermediário. Como qualquer script da página pode lê-la, use uma chave dedicada e com limite de
        gasto definido.
      </Aviso>
      <Aviso tom="ok">
        Sem chave o app funciona normalmente: registro de refeições pela tabela de alimentos, treino completo,
        ranking de força e recomendações. Só a leitura automática da foto e o coach ficam de fora.
      </Aviso>
    </div>,
  ]

  const ultimo = passo === passos.length - 1

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col px-4 pb-8 pt-safe">
      <div className="mb-6 mt-4 flex gap-1.5">
        {passos.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= passo ? 'bg-lime' : 'bg-white/10'}`}
          />
        ))}
      </div>

      <div className="flex-1">{passos[passo]}</div>

      <div className="mt-8 flex gap-3">
        {passo > 0 && (
          <Botao variante="fantasma" onClick={() => setPasso(passo - 1)}>
            Voltar
          </Botao>
        )}
        <Botao
          className="flex-1"
          onClick={() => (ultimo ? finalizar() : setPasso(passo + 1))}
          disabled={passo === 1 && (!p.alturaCm || !p.pesoKg)}
        >
          {ultimo ? (
            <>
              <Check size={18} /> Começar
            </>
          ) : (
            <>
              Continuar <ArrowRight size={18} />
            </>
          )}
        </Botao>
      </div>
    </div>
  )
}

function Cabecalho({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-2xl font-bold tracking-tight">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-400">{texto}</p>
    </div>
  )
}
