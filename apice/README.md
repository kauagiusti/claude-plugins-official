# Ápice

App de nutrição e treino. Fotografe a refeição e receba kcal e macros na hora; registre a série e veja onde sua
carga está em relação a quem treina — por peso, sexo e idade.

Roda como app nativo no iPhone (projeto iOS pronto em `ios/`) e como PWA no navegador. Todos os dados ficam no
aparelho — sem conta, sem servidor.

---

## O que ele faz

### Nutrição

- **Análise por foto.** A foto vai para o Claude (modelo `claude-opus-5`), que identifica cada alimento, estima a
  porção em gramas usando as referências de escala da imagem (prato, talher, lata) e devolve kcal, proteína,
  carboidrato, gordura, fibra, sódio e açúcar por item — com um grau de confiança por alimento.
- **Sempre editável.** Ajustar a quantidade reescala os macros do item. A estimativa é ponto de partida, não
  veredito.
- **Tabela de alimentos** com 124 itens brasileiros (base TACO e rótulos usuais) para registrar sem foto, com
  porções caseiras — "1 concha", "1 escumadeira", "1 filé médio".
- **Totais do dia** contra metas calculadas a partir do seu gasto energético (Mifflin-St Jeor, ou Katch-McArdle
  quando você informa o % de gordura).
- **Recomendação na hora**, em duas camadas: um motor local que roda sempre — inclusive sem internet ou sem chave
  de API — e a recomendação do Claude junto de cada análise de foto, que já considera o que falta no dia.

### Treino

- **206 exercícios** cobrindo barra, halteres, polia, máquina, Smith, peso corporal, kettlebell, elástico e
  cardio, com grupo muscular, músculos secundários e dicas de execução.
- **Comparação mundial a cada série.** Ao registrar, o app calcula o 1RM estimado e mostra nível
  (Iniciante → Elite), percentil na população treinada, múltiplo do peso corporal, quanto falta para o próximo
  nível e a régua completa dos cinco níveis.
- **Progressão sugerida** por dupla progressão, a partir do seu último registro no exercício.
- **Ranking geral**, recordes por exercício, volume semanal e 26 conquistas.

### Coach

Chat com o Claude que enxerga seus números — metas, consumo do dia, treinos recentes, recordes e percentis. Serve
para as perguntas que dependem do seu contexto: "o que jantar pra bater a proteína?", "meu supino travou, o que
faço?".

---

## Rodando

```bash
npm install
npm run dev          # http://localhost:5173
```

Build e conferência:

```bash
npm run build        # gera dist/
npm run preview      # serve o build em :4173
npm run typecheck
npm run smoke        # smoke test em navegador real (precisa do preview no ar)

npm run sync         # leva o build para o projeto iOS
npm run ios          # sync + abre o Xcode (só no Mac)
npm run capturas     # capturas da App Store, no tamanho exigido
```

### Conectar o Claude

A análise por foto e o coach usam a Claude API com a **sua** chave, configurada em
**Ajustes › Conectar Claude**. A tela tem teste de conexão, escolha entre Opus 5 e Sonnet 5 e estimativa de
gasto por análise. Todo o resto do app — tabela de alimentos, treino completo, ranking de força, recomendações
locais e gráficos — funciona sem chave nenhuma.

Pegue a chave em [console.anthropic.com](https://console.anthropic.com) › *Settings › API Keys*. Vale criar uma
chave dedicada, com limite de gasto: ela fica salva num aparelho.

**Como as chamadas saem:**

| | Onde a chave fica | Por onde a requisição vai |
|---|---|---|
| App iOS | UserDefaults, no container do app | Camada nativa — sem CORS, sem WebView no caminho |
| Navegador | `localStorage` | `fetch` da página, direto para `api.anthropic.com` |

Em nenhum dos dois casos existe servidor intermediário: suas fotos vão do aparelho para a Anthropic e mais nada.
A contrapartida, na web, é que a chave é legível por qualquer script da página. Para uso multiusuário, troque
`criarCliente` em `src/lib/claude.ts` por chamadas a um backend que guarde a chave do lado servidor.

### App para iPhone

O projeto iOS já está gerado com Capacitor em `ios/`. O que falta acontece num Mac:

```bash
npm run ios          # build + sync + abre o Xcode
npm run capturas     # capturas 1290×2796 para o App Store Connect
```

O passo a passo completo — assinatura, manifesto de privacidade, questionário de dados, envio e o que costuma
travar na revisão — está em **[`loja/README.md`](loja/README.md)**. Os textos da ficha, a política de privacidade
e as notas para o revisor estão na mesma pasta. Para cobrar pelo app, as contas de custo, margem e o caminho
até a assinatura estão em **[`loja/monetizacao.md`](loja/monetizacao.md)**.

No app nativo o Ápice usa câmera nativa, háptico ao registrar série e armazenamento em UserDefaults — o
`localStorage` da WKWebView pode ser descartado pelo iOS sob pressão de espaço, o que para meses de histórico
seria perda real.

### Instalar como PWA

Publique o `dist/` em qualquer host estático (Vercel, Netlify, Cloudflare Pages, GitHub Pages) e abra no celular →
menu do navegador → **Adicionar à tela de início**.

---

## Como a comparação de força funciona

O ponto delicado do app, então vale explicar.

**1. Carga do sistema.** O que o corpo move, não o que está escrito na anilha. Halteres e unilaterais contam os
dois lados; barra fixa, paralelas e flexão somam a fração do peso corporal que efetivamente atua no movimento.

**2. 1RM estimado.** Média de Epley e Brzycki — as duas divergem nos extremos e a média fica mais próxima do real
entre 3 e 10 repetições. Acima de 12 repetições o cálculo satura, porque nenhuma fórmula extrapola bem uma série
de 25; nesse caso o app avisa que a estimativa é conservadora.

**3. Conversão para o levantamento base.** Sete levantamentos têm tabela própria: agachamento, supino, terra,
desenvolvimento, remada, barra fixa e paralelas. Os outros 199 exercícios se conectam a um deles por um
coeficiente — leg press ≈ 2,0× agachamento; supino inclinado ≈ 0,82× supino reto. Assim uma série de leg press
entra na mesma escala de um agachamento, e o ranking mostra o valor já convertido (marcado com `~`), nunca a
carga crua da variação sob o nome do levantamento base.

**4. Padrões por peso, sexo e idade.** As tabelas em `src/data/padroesForca.ts` dão os cinco limiares para cada
peso corporal, interpolados linearmente entre as linhas. A idade aplica um fator no estilo dos coeficientes de
categorias master: pico entre 20 e 30 anos, queda progressiva depois.

**5. Percentil.** Os limiares ancoram em percentis (Iniciante ≈ 5, Novato ≈ 20, Intermediário ≈ 50, Avançado ≈ 80,
Elite ≈ 95) e o valor entre eles é interpolado; fora da faixa, satura suavemente.

**O que isso é e o que não é.** São referências de população treinada que reporta as próprias cargas — a mesma
natureza dos grandes bancos públicos de levantamento. Não é medição de laboratório nem amostra da população
geral: quem registra carga em app já é, em média, mais forte que a média. Trate como régua de acompanhamento e
motivação, não como dado científico.

---

## Estrutura

```
src/
├── data/
│   ├── exercicios.ts       206 exercícios + busca e filtros
│   ├── padroesForca.ts     tabelas de força por peso/sexo + fator idade
│   └── alimentos.ts        124 alimentos por 100 g + porções caseiras
├── lib/
│   ├── claude.ts           Claude API: análise de foto (saída estruturada) e coach (streaming)
│   ├── forca.ts            1RM, carga do sistema, nível, percentil, progressão
│   ├── nutricao.ts         TMB/TDEE, metas, totais, recomendação local
│   ├── gamificacao.ts      XP, níveis, streak, 26 conquistas
│   ├── store.ts            estado (zustand + persist) e seletores
│   ├── imagem.ts           redimensionamento antes do envio
│   └── nativo.ts           câmera, armazenamento, háptico e HTTP nativo (Capacitor)
├── components/             UI, analisador de foto, conexão Claude, gráficos, coach
└── pages/                  Hoje · Nutrição · Treino · Ranking · Ajustes · Onboarding

ios/                        projeto Xcode (Capacitor) — abra com `npm run ios`
loja/                       ficha da App Store, privacidade, notas de revisão, guia
scripts/                    smoke test e gerador de capturas da loja
```

**Decisões que valem saber:**

- **Zero backend.** Tudo em `localStorage` via `zustand/persist`. Exportação em JSON fica em Ajustes; fotos são
  guardadas como miniatura e as anteriores a 21 dias são descartadas, senão o `localStorage` estoura.
- **Estrutura de dados fatiada por dia.** Refeições e treinos guardam a data local (`YYYY-MM-DD`), nunca UTC —
  um treino às 22h de terça tem que cair na terça.
- **Saída estruturada na análise.** A chamada usa `output_config.format` com JSON Schema, então a resposta vem
  validada em vez de depender de parsing de texto livre. `stop_reason: "refusal"` é tratado, e a chamada declara
  `fallbacks: "default"` para que uma recusa de classificador seja reatendida por outro modelo.
- **Cores dos gráficos são próprias.** Os tons vivos da marca ficam claros demais como marca de dado sobre fundo
  escuro; os gráficos usam passos mais escuros dos mesmos matizes, validados para banda de luminosidade, croma,
  separação para daltonismo e contraste.

---

## Limites

- As estimativas por foto erram — molho escondido, óleo de fritura e o que está embaixo da superfície são
  invisíveis. Confira as quantidades antes de salvar; é para isso que tudo é editável.
- A tabela de alimentos usa valores médios. Produto industrializado específico: use o rótulo.
- Percentis de força são referência de população treinada, não medição clínica.
- Ápice não é ferramenta de saúde. Condição clínica, dieta terapêutica, lesão ou dor persistente pedem
  profissional habilitado.
