import { Dumbbell, Home, MessageCircle, Settings, Trophy, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CoachPainel } from './components/CoachPainel'
import { PopupConquista } from './components/PopupConquista'
import { cx } from './components/ui'
import Ajustes from './pages/Ajustes'
import Hoje from './pages/Hoje'
import Nutricao from './pages/Nutricao'
import Onboarding from './pages/Onboarding'
import Ranking from './pages/Ranking'
import Treino from './pages/Treino'
import { useStore } from './lib/store'

export type Aba = 'hoje' | 'nutricao' | 'treino' | 'ranking' | 'ajustes'

const ABAS: { id: Aba; nome: string; icone: typeof Home }[] = [
  { id: 'hoje', nome: 'Hoje', icone: Home },
  { id: 'nutricao', nome: 'Comida', icone: UtensilsCrossed },
  { id: 'treino', nome: 'Treino', icone: Dumbbell },
  { id: 'ranking', nome: 'Ranking', icone: Trophy },
  { id: 'ajustes', nome: 'Ajustes', icone: Settings },
]

export default function App() {
  const [aba, setAba] = useState<Aba>('hoje')
  const [coachAberto, setCoachAberto] = useState(false)
  const onboardingConcluido = useStore((s) => s.onboardingConcluido)
  const hidratado = useStore((s) => s.hidratado)
  const treinoAtivo = useStore((s) => s.treinoAtivo)

  // Cada troca de aba começa do topo — nada pior que abrir uma aba no meio.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [aba])

  // O armazenamento nativo é assíncrono: sem essa espera o app pisca a tela de
  // boas-vindas para quem já é usuário, no meio segundo até o estado carregar.
  if (!hidratado) return <TelaDeAbertura />

  if (!onboardingConcluido) return <Onboarding />

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      <main className="flex-1 px-4 pb-32 pt-safe">
        {aba === 'hoje' && <Hoje irPara={setAba} />}
        {aba === 'nutricao' && <Nutricao />}
        {aba === 'treino' && <Treino />}
        {aba === 'ranking' && <Ranking />}
        {aba === 'ajustes' && <Ajustes />}
      </main>

      <button
        onClick={() => setCoachAberto(true)}
        aria-label="Abrir coach"
        className={cx(
          'fixed right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full',
          'bg-gradient-to-br from-lime to-lime-soft text-ink-950 shadow-lg shadow-lime/20',
          'transition-all active:scale-95',
          // Durante o treino o botão "Concluir treino" fica fixo acima da
          // navegação; o coach sobe para não cobri-lo.
          aba === 'treino' && treinoAtivo ? 'bottom-44' : 'bottom-24',
        )}
      >
        <MessageCircle size={21} />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-stretch pb-safe">
          {ABAS.map(({ id, nome, icone: Icone }) => {
            const ativo = aba === id
            const pulsando = id === 'treino' && !!treinoAtivo && !ativo
            return (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={cx(
                  'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition',
                  ativo ? 'text-lime' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <Icone size={21} strokeWidth={ativo ? 2.4 : 1.8} />
                {nome}
                {pulsando && (
                  <span className="absolute right-[26%] top-2 h-2 w-2 animate-pulse rounded-full bg-flame" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <CoachPainel aberto={coachAberto} aoFechar={() => setCoachAberto(false)} />
      <PopupConquista />
    </div>
  )
}

/** Ponte visual entre o splash nativo e o app carregado. */
function TelaDeAbertura() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <svg width="56" height="56" viewBox="0 0 100 100" aria-label="Ápice" className="animate-pulse">
        <path
          d="M24 66 L50 29 L76 66"
          fill="none"
          stroke="#c6f24e"
          strokeWidth="10.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="32" y1="78" x2="68" y2="78" stroke="#4ec3f2" strokeWidth="5.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
