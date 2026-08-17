import { Check, Dumbbell, Flame, Play, Plus, Timer, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NivelSerie } from '../components/NivelSerie'
import { SeletorExercicio } from '../components/SeletorExercicio'
import { Aviso, Botao, Cartao, Chip, Estatistica, TituloSecao, Vazio } from '../components/ui'
import { EQUIPAMENTOS, EXERCICIOS_POR_ID } from '../data/exercicios'
import { classificarSerie, sugerirProgressao } from '../lib/forca'
import { vibrar } from '../lib/nativo'
import { ultimaSerieDe, useStore, volumeDoTreino } from '../lib/store'
import type { ClassificacaoForca, Exercicio, ExercicioSessao } from '../types'

export default function Treino() {
  const treinoAtivo = useStore((s) => s.treinoAtivo)
  return treinoAtivo ? <TreinoEmAndamento /> : <SemTreino />
}

// ---------------------------------------------------------------------------

function SemTreino() {
  const treinos = useStore((s) => s.treinos)
  const perfil = useStore((s) => s.perfil)
  const iniciar = useStore((s) => s.iniciarTreino)
  const [nome, setNome] = useState('')

  const recentes = [...treinos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6)
  const sugestoesNome = ['Push', 'Pull', 'Pernas', 'Superior', 'Inferior', 'Full body']

  return (
    <div className="space-y-5 pt-3">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Treino</h1>
        <p className="text-sm text-slate-400">Registre a série e veja onde você está no mundo.</p>
      </header>

      <Cartao className="space-y-3">
        <input
          className="campo"
          placeholder="Nome do treino (opcional)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {sugestoesNome.map((s) => (
            <Chip key={s} ativo={nome === s} onClick={() => setNome(s)}>
              {s}
            </Chip>
          ))}
        </div>
        <Botao onClick={() => iniciar(nome || 'Treino')} className="w-full py-3.5">
          <Play size={18} /> Iniciar treino
        </Botao>
      </Cartao>

      <div>
        <TituloSecao>Treinos recentes</TituloSecao>
        {recentes.length === 0 ? (
          <Vazio
            icone={<Dumbbell size={32} />}
            titulo="Nenhum treino ainda"
            texto="Comece o primeiro — dá para adicionar exercícios conforme for treinando."
          />
        ) : (
          <div className="space-y-2">
            {recentes.map((t) => (
              <Cartao key={t.id}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{t.nome}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(`${t.data}T12:00:00`).toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {t.exercicios
                        .map((e) => EXERCICIOS_POR_ID[e.exercicioId]?.nome)
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums">
                      {Math.round(volumeDoTreino(t, perfil.pesoKg)).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-slate-500">kg</p>
                  </div>
                </div>
              </Cartao>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function TreinoEmAndamento() {
  const treino = useStore((s) => s.treinoAtivo)!
  const perfil = useStore((s) => s.perfil)
  const addExercicio = useStore((s) => s.addExercicioSessao)
  const concluir = useStore((s) => s.concluirTreino)
  const cancelar = useStore((s) => s.cancelarTreino)
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [confirmarSaida, setConfirmarSaida] = useState(false)

  const decorrido = useDecorrido(treino.inicio)
  const volume = volumeDoTreino(treino, perfil.pesoKg)
  const seriesFeitas = treino.exercicios.reduce((a, e) => a + e.series.filter((s) => s.concluida).length, 0)

  return (
    <div className="space-y-4 pt-3">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lime" />
            <h1 className="text-xl font-bold">{treino.nome}</h1>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-slate-400">
            <Timer size={14} /> {decorrido}
          </p>
        </div>
        <button
          onClick={() => setConfirmarSaida(true)}
          className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-red-400"
        >
          <X size={20} />
        </button>
      </header>

      <Cartao className="grid grid-cols-3 gap-2 text-center">
        <Estatistica rotulo="Exercícios" valor={treino.exercicios.length} />
        <Estatistica rotulo="Séries" valor={seriesFeitas} />
        <Estatistica rotulo="Volume" valor={Math.round(volume).toLocaleString('pt-BR')} sufixo="kg" />
      </Cartao>

      {treino.exercicios.length === 0 && (
        <Aviso tom="info">
          Adicione o primeiro exercício. Ao registrar cada série você vê na hora o nível e o percentil daquela carga.
        </Aviso>
      )}

      <div className="space-y-3">
        {treino.exercicios.map((sessao) => (
          <BlocoExercicio key={sessao.id} sessao={sessao} />
        ))}
      </div>

      <Botao variante="secundario" onClick={() => setSeletorAberto(true)} className="w-full py-3.5">
        <Plus size={18} /> Adicionar exercício
      </Botao>

      <div className="sticky bottom-20 pt-2">
        <Botao onClick={concluir} className="w-full py-3.5" disabled={seriesFeitas === 0}>
          <Check size={18} /> Concluir treino
        </Botao>
      </div>

      <SeletorExercicio
        aberto={seletorAberto}
        aoFechar={() => setSeletorAberto(false)}
        aoEscolher={(ex: Exercicio) => addExercicio(ex.id)}
      />

      {confirmarSaida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmarSaida(false)} />
          <Cartao className="relative w-full max-w-sm space-y-3">
            <p className="font-semibold">Descartar este treino?</p>
            <p className="text-sm text-slate-400">
              As {seriesFeitas} série(s) registradas serão perdidas. Para guardar, use “Concluir treino”.
            </p>
            <div className="flex gap-2">
              <Botao variante="fantasma" className="flex-1" onClick={() => setConfirmarSaida(false)}>
                Voltar
              </Botao>
              <Botao variante="perigo" className="flex-1" onClick={cancelar}>
                Descartar
              </Botao>
            </div>
          </Cartao>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function BlocoExercicio({ sessao }: { sessao: ExercicioSessao }) {
  const perfil = useStore((s) => s.perfil)
  const estado = useStore()
  const addSerie = useStore((s) => s.addSerie)
  const removerSerie = useStore((s) => s.removerSerie)
  const removerExercicio = useStore((s) => s.removerExercicioSessao)

  const ex = EXERCICIOS_POR_ID[sessao.exercicioId]
  const ultima = useMemo(() => ultimaSerieDe(estado, sessao.exercicioId), [estado, sessao.exercicioId])
  const sugestao = useMemo(() => (ex ? sugerirProgressao(ultima, ex) : null), [ultima, ex])

  const [peso, setPeso] = useState<string>(() => String(sugestao?.peso ?? ultima?.peso ?? ''))
  const [reps, setReps] = useState<string>(() => String(sugestao?.reps ?? ultima?.reps ?? ''))
  const [aquecimento, setAquecimento] = useState(false)
  const [ultimaCls, setUltimaCls] = useState<{ cls: ClassificacaoForca; reps: number } | null>(null)

  if (!ex) return null

  const ehCardio = ex.tipo === 'cardio'
  const rotuloPeso = ex.unilateral ? 'kg (cada)' : ehCardio ? 'min' : 'kg'
  const rotuloReps = ehCardio ? 'intensidade' : 'reps'

  function registrar() {
    const p = Number(peso) || 0
    const r = Number(reps) || 0
    if (r <= 0) return

    addSerie(sessao.id, { peso: p, reps: r, aquecimento, concluida: true })
    void vibrar(aquecimento ? 'leve' : 'medio')

    if (!aquecimento) {
      const cls = classificarSerie(sessao.exercicioId, { id: '', peso: p, reps: r, concluida: true }, perfil)
      setUltimaCls(cls ? { cls, reps: r } : null)
    }
    setAquecimento(false)
  }

  const seriesValidas = sessao.series.filter((s) => !s.aquecimento && s.concluida)

  return (
    <Cartao className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{ex.nome}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {ex.grupo} · {EQUIPAMENTOS.find((e) => e.id === ex.equipamento)?.nome}
            {ex.unilateral && ' · carga por lado'}
            {ex.usaPesoCorporal && ' · soma o peso corporal'}
          </p>
        </div>
        <button
          onClick={() => removerExercicio(sessao.id)}
          className="shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-white/5 hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {ex.dica && <p className="text-[12px] leading-relaxed text-slate-500">{ex.dica}</p>}

      {/* --------------------------- Séries feitas -------------------------- */}
      {sessao.series.length > 0 && (
        <div className="space-y-1">
          {sessao.series.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm"
            >
              <span className="w-5 shrink-0 text-center text-xs text-slate-500">
                {s.aquecimento ? 'A' : seriesValidas.indexOf(s) + 1 || i + 1}
              </span>
              <span className="tabular-nums">
                {s.peso > 0 ? `${s.peso} ${ehCardio ? 'min' : 'kg'}` : 'corporal'} × {s.reps}
              </span>
              {s.e1rm ? (
                <span className="text-xs text-slate-500">1RM ~{s.e1rm.toFixed(0)}kg</span>
              ) : null}
              <button
                onClick={() => removerSerie(sessao.id, s.id)}
                className="ml-auto text-slate-600 hover:text-red-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --------------------------- Nova série ---------------------------- */}
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">{rotuloPeso}</span>
          <input
            type="number"
            inputMode="decimal"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-center text-lg
                       font-semibold tabular-nums outline-none focus:border-lime/50"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">{rotuloReps}</span>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-center text-lg
                       font-semibold tabular-nums outline-none focus:border-lime/50"
          />
        </label>
        <Botao
          onClick={registrar}
          disabled={!Number(reps)}
          aria-label="Registrar série"
          title="Registrar série"
          className="h-[46px] px-4"
        >
          <Plus size={19} />
        </Botao>
      </div>

      <div className="space-y-1.5">
        <button
          onClick={() => setAquecimento(!aquecimento)}
          className={
            aquecimento
              ? 'flex items-center gap-1.5 text-xs text-amber-300'
              : 'flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300'
          }
        >
          <Flame size={13} /> {aquecimento ? 'Marcada como aquecimento' : 'Marcar como aquecimento'}
        </button>
        {sugestao && <p className="text-[11px] leading-relaxed text-slate-500">{sugestao.texto}</p>}
      </div>

      {ultimaCls && (
        <div className="animate-slideUp">
          <NivelSerie cls={ultimaCls.cls} reps={ultimaCls.reps} />
        </div>
      )}

      {!ex.ref && !ehCardio && (
        <p className="text-[11px] text-slate-600">
          Este exercício não tem tabela de comparação mundial — o registro conta para volume, PR e progressão.
        </p>
      )}
    </Cartao>
  )
}

/** Cronômetro do treino, atualizado a cada 30 s (não precisa de mais). */
function useDecorrido(inicioIso: string): string {
  const [, forcar] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forcar((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])
  const min = Math.max(0, Math.floor((Date.now() - new Date(inicioIso).getTime()) / 60000))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}min`
}
