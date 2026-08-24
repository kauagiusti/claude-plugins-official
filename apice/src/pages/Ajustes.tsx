import { Check, Download, Key, RotateCcw, Scale, Target, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConexaoClaude } from '../components/ConexaoClaude'
import { Aviso, Botao, Campo, Cartao, Chip, Estatistica, Interruptor, Selecao, TituloSecao } from '../components/ui'
import { alturaReferencia } from '../data/padroesForca'
import { idadeDe } from '../lib/forca'
import { calcularMetas, ROTULO_ATIVIDADE, ROTULO_OBJETIVO, tdee, tmb } from '../lib/nutricao'
import { hojeISO, useStore } from '../lib/store'
import type { NivelAtividade, Objetivo } from '../types'

export default function Ajustes() {
  const perfil = useStore((s) => s.perfil)
  const setPerfil = useStore((s) => s.setPerfil)
  const registrarPeso = useStore((s) => s.registrarPeso)
  const resetar = useStore((s) => s.resetarTudo)
  const estado = useStore()

  const [pesoNovo, setPesoNovo] = useState('')
  const [confirmarReset, setConfirmarReset] = useState(false)

  const metas = useMemo(() => calcularMetas(perfil), [perfil])
  const manutencao = useMemo(() => Math.round(tdee(perfil)), [perfil])
  const basal = useMemo(() => Math.round(tmb(perfil)), [perfil])
  const usandoManuais = !!perfil.metasManuais

  function exportarDados() {
    const dump = {
      exportadoEm: new Date().toISOString(),
      perfil: estado.perfil,
      refeicoes: estado.refeicoes.map(({ fotoDataUrl: _foto, ...r }) => r),
      treinos: estado.treinos,
      pesos: estado.pesos,
      jogo: estado.jogo,
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `apice-${hojeISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 pt-3">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      </header>

      {/* -------------------------------- Perfil ---------------------------- */}
      <section>
        <TituloSecao>
          <User size={13} className="mr-1 inline" /> Perfil
        </TituloSecao>
        <Cartao className="space-y-3">
          <Campo rotulo="Nome" value={perfil.nome} onChange={(e) => setPerfil({ nome: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="rotulo">Sexo</span>
              <div className="flex gap-2">
                <Chip ativo={perfil.sexo === 'M'} onClick={() => setPerfil({ sexo: 'M' })}>
                  M
                </Chip>
                <Chip ativo={perfil.sexo === 'F'} onClick={() => setPerfil({ sexo: 'F' })}>
                  F
                </Chip>
              </div>
            </div>
            <Campo
              rotulo="Nascimento"
              type="date"
              value={perfil.nascimento}
              onChange={(e) => setPerfil({ nascimento: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo
              rotulo="Altura"
              type="number"
              inputMode="numeric"
              sufixo="cm"
              value={perfil.alturaCm || ''}
              onChange={(e) => setPerfil({ alturaCm: Number(e.target.value) })}
            />
            <Campo
              rotulo="Gordura corporal"
              type="number"
              inputMode="decimal"
              sufixo="%"
              value={perfil.gorduraPct ?? ''}
              placeholder="opcional"
              onChange={(e) => setPerfil({ gorduraPct: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            {idadeDe(perfil.nascimento)} anos. Peso, sexo e idade entram na comparação de força: os dois primeiros
            escolhem a tabela de padrões, a idade aplica os mesmos coeficientes usados nas categorias master.
          </p>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
            <Interruptor
              ligado={perfil.ajustarPorAltura !== false}
              onChange={(v) => setPerfil({ ajustarPorAltura: v })}
              rotulo="Considerar altura na comparação"
              descricao={
                <>
                  Comparado com a altura típica de quem treina no seu peso (
                  {alturaReferencia(perfil.sexo, perfil.pesoKg).toFixed(0)} cm), ser mais alto é desvantagem
                  mecânica: membro mais longo, percurso maior e secção muscular mais fina para a mesma massa. O
                  ajuste vai no máximo a 8% e pesa mais no agachamento que no terra, onde braço longo compensa.
                </>
              }
            />
            <p className="mt-3 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-slate-500">
              <strong className="font-semibold text-slate-400">Por que dá para desligar:</strong> peso, sexo e
              idade vêm de dados observados — cargas reportadas e resultados de competição. Altura não: não existe
              base pública de padrões de força por altura, e nenhum sistema de pontuação em uso (Wilks, DOTS,
              IPF GL) usa altura. O ajuste do Ápice é um modelo mecânico declarado, não uma medição. Desligado, a
              comparação usa só o que é observado.
            </p>
          </div>
        </Cartao>
      </section>

      {/* --------------------------------- Peso ----------------------------- */}
      <section>
        <TituloSecao>
          <Scale size={13} className="mr-1 inline" /> Peso corporal
        </TituloSecao>
        <Cartao className="space-y-3">
          <div className="flex items-end gap-2">
            <Campo
              rotulo="Registrar peso de hoje"
              type="number"
              inputMode="decimal"
              sufixo="kg"
              placeholder={String(perfil.pesoKg)}
              value={pesoNovo}
              onChange={(e) => setPesoNovo(e.target.value)}
              className="flex-1"
            />
            <Botao
              onClick={() => {
                const v = Number(pesoNovo)
                if (v > 0) {
                  registrarPeso(v)
                  setPesoNovo('')
                }
              }}
              disabled={!Number(pesoNovo)}
              className="h-[46px]"
            >
              <Check size={17} />
            </Botao>
          </div>
          <p className="text-xs text-slate-500">
            Atual: <strong className="text-slate-300">{perfil.pesoKg} kg</strong> · {estado.pesos.length} registro(s)
            no histórico. O peso entra nas metas e em toda a comparação de força — mantenha atualizado.
          </p>
        </Cartao>
      </section>

      {/* -------------------------------- Metas ----------------------------- */}
      <section>
        <TituloSecao>
          <Target size={13} className="mr-1 inline" /> Metas nutricionais
        </TituloSecao>
        <Cartao className="space-y-3">
          <Selecao
            rotulo="Nível de atividade"
            value={perfil.atividade}
            onChange={(e) => setPerfil({ atividade: e.target.value as NivelAtividade })}
          >
            {Object.entries(ROTULO_ATIVIDADE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Selecao>

          <Selecao
            rotulo="Objetivo"
            value={perfil.objetivo}
            onChange={(e) => setPerfil({ objetivo: e.target.value as Objetivo })}
          >
            {Object.entries(ROTULO_OBJETIVO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Selecao>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              rotulo="Proteína"
              type="number"
              inputMode="decimal"
              sufixo="g/kg"
              value={perfil.proteinaPorKg}
              onChange={(e) => setPerfil({ proteinaPorKg: Number(e.target.value) })}
              dica="1,6–2,2 para quem treina força"
            />
            <Campo
              rotulo="Gordura"
              type="number"
              inputMode="decimal"
              sufixo="g/kg"
              value={perfil.gorduraPorKg}
              onChange={(e) => setPerfil({ gorduraPorKg: Number(e.target.value) })}
              dica="não desça abaixo de 0,6"
            />
          </div>

          <Campo
            rotulo="Ajuste calórico manual"
            type="number"
            inputMode="numeric"
            sufixo="kcal"
            value={perfil.ajusteKcal}
            onChange={(e) => setPerfil({ ajusteKcal: Number(e.target.value) })}
            dica="Soma ou subtrai do valor calculado. Use se o peso não se mexer por 2–3 semanas."
          />

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/[0.03] p-3 text-center">
            <Estatistica rotulo="Basal" valor={basal} sufixo="kcal" />
            <Estatistica rotulo="Manutenção" valor={manutencao} sufixo="kcal" />
            <Estatistica rotulo="Meta" valor={metas.kcal} sufixo="kcal" cor="#c6f24e" />
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {[
              ['Proteína', metas.proteina, '#4ec3f2'],
              ['Carbo', metas.carbo, '#c6f24e'],
              ['Gordura', metas.gordura, '#ff7a45'],
              ['Fibra', metas.fibra, '#a78bfa'],
            ].map(([rot, val, cor]) => (
              <div key={rot as string} className="rounded-lg bg-white/[0.03] py-2">
                <p className="text-[10px] text-slate-500">{rot as string}</p>
                <p className="font-semibold tabular-nums" style={{ color: cor as string }}>
                  {val as number}g
                </p>
              </div>
            ))}
          </div>

          {usandoManuais ? (
            <Botao variante="fantasma" className="w-full" onClick={() => setPerfil({ metasManuais: null })}>
              Voltar ao cálculo automático
            </Botao>
          ) : (
            <Botao variante="fantasma" className="w-full" onClick={() => setPerfil({ metasManuais: metas })}>
              Fixar estas metas manualmente
            </Botao>
          )}
        </Cartao>
      </section>

      {/* ---------------------------- Conectar Claude ----------------------- */}
      <section>
        <TituloSecao>
          <Key size={13} className="mr-1 inline" /> Conectar Claude
        </TituloSecao>
        <ConexaoClaude />
      </section>

      {/* --------------------------------- Dados ---------------------------- */}
      <section>
        <TituloSecao>Dados</TituloSecao>
        <Cartao className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Estatistica rotulo="Refeições" valor={estado.refeicoes.length} />
            <Estatistica rotulo="Treinos" valor={estado.treinos.length} />
            <Estatistica rotulo="XP" valor={estado.jogo.xp.toLocaleString('pt-BR')} />
          </div>
          <Botao variante="secundario" className="w-full" onClick={exportarDados}>
            <Download size={17} /> Exportar meus dados (JSON)
          </Botao>
          <p className="text-xs text-slate-500">
            Tudo fica salvo neste aparelho. Limpar os dados do navegador apaga o histórico — exporte de vez em
            quando.
          </p>

          {confirmarReset ? (
            <div className="space-y-2">
              <Aviso tom="alerta">
                Isso apaga perfil, refeições, treinos, conquistas e XP. Não dá para desfazer.
              </Aviso>
              <div className="flex gap-2">
                <Botao variante="fantasma" className="flex-1" onClick={() => setConfirmarReset(false)}>
                  Cancelar
                </Botao>
                <Botao variante="perigo" className="flex-1" onClick={resetar}>
                  Apagar tudo
                </Botao>
              </div>
            </div>
          ) : (
            <Botao variante="perigo" className="w-full" onClick={() => setConfirmarReset(true)}>
              <RotateCcw size={17} /> Apagar todos os dados
            </Botao>
          )}
        </Cartao>
      </section>

      <p className="pb-4 text-center text-xs leading-relaxed text-slate-600">
        Ápice não é ferramenta clínica. Estimativas nutricionais e de força são referências para acompanhamento
        pessoal — condições de saúde, dietas terapêuticas e lesões pedem profissional habilitado.
      </p>
    </div>
  )
}
