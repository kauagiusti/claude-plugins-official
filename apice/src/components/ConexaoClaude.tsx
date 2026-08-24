import { Check, ExternalLink, Eye, EyeOff, Key, Sparkles, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { mensagemDeErro, MODELOS, testarChave, type ModeloId } from '../lib/claude'
import { ehNativo } from '../lib/nativo'
import { useStore } from '../lib/store'
import { Aviso, Botao, Cartao, Estatistica, cx } from './ui'

const URL_CONSOLE = 'https://console.anthropic.com/settings/keys'

/**
 * Conexão com a Claude API.
 *
 * É a única configuração do app que depende de algo externo, então ela ganha
 * espaço próprio: estado da conexão, teste antes de salvar, escolha de modelo e
 * o que isso custa por análise.
 */
export function ConexaoClaude() {
  const apiKey = useStore((s) => s.apiKey)
  const setApiKey = useStore((s) => s.setApiKey)
  const modelo = useStore((s) => s.modelo)
  const setModelo = useStore((s) => s.setModelo)
  const analises = useStore((s) => s.analisesFeitas)

  const [rascunho, setRascunho] = useState(apiKey)
  const [visivel, setVisivel] = useState(false)
  const [testando, setTestando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; erro?: string } | null>(null)

  const conectado = apiKey.length > 0
  const alterada = rascunho.trim() !== apiKey
  const modeloAtual = MODELOS.find((m) => m.id === modelo) ?? MODELOS[0]
  const gastoEstimado = analises * modeloAtual.custoPorAnalise

  async function testar() {
    setTestando(true)
    setResultado(null)
    try {
      setResultado(await testarChave(rascunho, modelo))
    } catch (e) {
      setResultado({ ok: false, erro: mensagemDeErro(e) })
    } finally {
      setTestando(false)
    }
  }

  function salvar() {
    setApiKey(rascunho)
    setResultado(null)
  }

  return (
    <div className="space-y-3">
      {/* ----------------------------- Estado ----------------------------- */}
      <Cartao
        className={cx(
          'flex items-center gap-3.5',
          conectado ? 'border-lime/30 bg-lime/[0.05]' : 'border-white/10',
        )}
      >
        <div
          className={cx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            conectado ? 'bg-lime/15 text-lime' : 'bg-white/5 text-slate-500',
          )}
        >
          {conectado ? <Wifi size={20} /> : <WifiOff size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{conectado ? 'Claude conectado' : 'Claude não conectado'}</p>
          <p className="text-xs text-slate-400">
            {conectado
              ? `Análise por foto e coach ativos · ${modeloAtual.nome}`
              : 'Cole sua chave abaixo para ativar a análise por foto e o coach'}
          </p>
        </div>
      </Cartao>

      {import.meta.env.VITE_PREVIEW_SANDBOX && (
        <Aviso tom="info">
          <strong className="font-semibold">Esta é a versão de demonstração.</strong> Ela roda num
          sandbox que bloqueia chamadas para fora do domínio, então o teste de conexão e a análise
          por foto vão falhar aqui mesmo com uma chave válida. Todo o resto — treino, ranking de
          força, tabela de alimentos, metas e gráficos — funciona normalmente. Para usar o Claude,
          rode o app num host próprio ou no iPhone.
        </Aviso>
      )}

      {/* ------------------------------ Chave ----------------------------- */}
      <Cartao className="space-y-3">
        <div>
          <span className="rotulo">
            <Key size={12} className="mr-1 inline" /> Chave da API
          </span>
          <div className="relative">
            <input
              type={visivel ? 'text' : 'password'}
              className="campo pr-11 font-mono text-[13px]"
              placeholder="sk-ant-api03-..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={rascunho}
              onChange={(e) => {
                setRascunho(e.target.value)
                setResultado(null)
              }}
            />
            <button
              type="button"
              onClick={() => setVisivel(!visivel)}
              aria-label={visivel ? 'Ocultar chave' : 'Mostrar chave'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Botao variante="secundario" onClick={testar} disabled={!rascunho.trim() || testando}>
            {testando ? 'Testando…' : 'Testar conexão'}
          </Botao>
          <Botao className="flex-1" onClick={salvar} disabled={!alterada}>
            <Check size={17} /> {conectado && !alterada ? 'Salva' : 'Salvar'}
          </Botao>
        </div>

        {resultado && (
          <Aviso tom={resultado.ok ? 'ok' : 'alerta'}>
            {resultado.ok
              ? 'Conexão funcionando. Salve para começar a usar.'
              : resultado.erro}
          </Aviso>
        )}

        {conectado && (
          <button
            onClick={() => {
              setApiKey('')
              setRascunho('')
              setResultado(null)
            }}
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-red-400"
          >
            Remover chave deste aparelho
          </button>
        )}
      </Cartao>

      {/* ------------------------------ Modelo ---------------------------- */}
      <Cartao className="space-y-2.5">
        <span className="rotulo">
          <Sparkles size={12} className="mr-1 inline" /> Modelo
        </span>
        {MODELOS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModelo(m.id as ModeloId)}
            className={cx(
              'w-full rounded-xl border px-3.5 py-3 text-left transition',
              modelo === m.id
                ? 'border-lime/50 bg-lime/[0.08]'
                : 'border-white/10 bg-white/[0.02] hover:border-white/20',
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className={cx('font-medium', modelo === m.id && 'text-lime')}>{m.nome}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                ~US$ {m.custoPorAnalise.toFixed(3)} por foto
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-slate-400">{m.descricao}</p>
          </button>
        ))}
        <p className="text-[11px] leading-relaxed text-slate-500">
          Custos são estimativas por análise, cobradas pela Anthropic direto na sua conta. O app não intermedeia
          pagamento nenhum.
        </p>
      </Cartao>

      {/* -------------------------------- Uso ----------------------------- */}
      {analises > 0 && (
        <Cartao className="grid grid-cols-2 gap-3 text-center">
          <Estatistica rotulo="Fotos analisadas" valor={analises} />
          <Estatistica rotulo="Gasto estimado" valor={`US$ ${gastoEstimado.toFixed(2)}`} />
          <p className="col-span-2 text-[11px] text-slate-500">
            Estimativa local pelo número de análises. O valor real está no painel da Anthropic.
          </p>
        </Cartao>
      )}

      {/* ---------------------------- Como obter -------------------------- */}
      {!conectado && (
        <Cartao className="space-y-2.5">
          <p className="text-sm font-medium">Como pegar sua chave</p>
          <ol className="space-y-2 text-[13px] leading-relaxed text-slate-400">
            <li>
              <strong className="text-slate-300">1.</strong> Crie uma conta em console.anthropic.com e adicione
              créditos (US$ 5 já dão para centenas de análises).
            </li>
            <li>
              <strong className="text-slate-300">2.</strong> Vá em <em>Settings › API Keys</em> e clique em
              <em> Create Key</em>.
            </li>
            <li>
              <strong className="text-slate-300">3.</strong> Defina um limite de gasto mensal nessa chave — ela vai
              ficar salva num aparelho.
            </li>
            <li>
              <strong className="text-slate-300">4.</strong> Copie a chave (ela só aparece uma vez) e cole aqui.
            </li>
          </ol>
          <a
            href={URL_CONSOLE}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-sm text-lime hover:underline"
          >
            Abrir o console da Anthropic <ExternalLink size={14} />
          </a>
        </Cartao>
      )}

      <Aviso tom="info">
        A chave fica só neste aparelho{ehNativo() ? ' (no armazenamento protegido do app)' : ' (no armazenamento do navegador)'} e
        as requisições vão direto para a Anthropic — suas fotos não passam por servidor nosso, porque não existe
        servidor nosso. Use uma chave dedicada, com limite de gasto.
      </Aviso>
    </div>
  )
}
