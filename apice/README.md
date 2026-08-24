# Ápice

App de nutrição e treino. Fotografe a refeição ou escaneie a embalagem e receba kcal, macros e a avaliação do
rótulo; registre a série e veja onde sua carga está em relação a quem treina — por peso, sexo, idade e altura.

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
- **Código de barras.** Aponte a câmera para a embalagem e o app busca o produto no Open Food Facts: tabela
  nutricional, lista de ingredientes, aditivos e classificação NOVA. A avaliação usa os limiares reais da
  rotulagem frontal brasileira (ANVISA, RDC 429/2020): açúcar, gordura saturada e sódio acima do limite viram
  marcador "ALTO EM", com o número e o limite lado a lado. Roda sem chave de API.
- **Tabela de alimentos** com 124 itens brasileiros (base TACO e rótulos usuais) para registrar sem foto, com
  porções caseiras — "1 concha", "1 escumadeira", "1 filé médio".
- **Totais do dia** contra metas calculadas a partir do seu gasto energético (Mifflin-St Jeor, ou Katch-McArdle
  quando você informa o % de gordura).
- **Recomendação na hora**, em duas camadas: um motor local que roda sempre — inclusive sem internet ou sem chave
  de API — e a recomendação do Claude junto de cada análise de foto, que já considera o que falta no dia.

### Treino

- **206 exercícios** cobrindo barra, halteres, polia, máquina, Smith, peso corporal, kettlebell, elástico e
  cardio, com grupo muscular, músculos secundários e dicas de execução.
- **Desenho de cada exercício** ao lado do nome, na busca, no treino em andamento e no ranking — dá para achar o
  movimento pela figura antes de ler o nome.
- **Comparação a cada série.** Ao registrar, o app calcula o 1RM estimado e mostra nível (Iniciante → Elite),
  percentil na população treinada, múltiplo do peso corporal, quanto falta para o próximo nível e a régua
  completa dos cinco níveis. Peso, sexo, idade e altura entram na conta — e a tela diz quanto cada um mexeu.
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
npm test             # testes das partes que decidem números
npm run smoke        # 15 checagens em navegador real (precisa do preview no ar)

npm run site         # o app inteiro num único HTML (dist-site/apice.html)

npm run sync         # leva o build para o projeto iOS
npm run ios          # sync + abre o Xcode (só no Mac)
npm run capturas     # capturas da App Store, no tamanho exigido
npm run privacidade  # regera loja/privacidade.html a partir do .md
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

### Versão de página única

`npm run site` empacota o app inteiro — JavaScript, CSS e ícones — em um `dist-site/apice.html` de ~900 kB, sem
nenhum arquivo ao lado. Serve para mostrar o app onde só cabe uma página: anexo, pen drive, hospedeiro de
pré-visualização. Essa build marca `VITE_PREVIEW_SANDBOX`, e a tela de conexão avisa que chamadas para a Anthropic
podem estar bloqueadas pelo ambiente. Para publicar de verdade, use o `dist/` — ele divide o JavaScript e cacheia
melhor.

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

**4b. Altura — e por que ela é diferente das outras três.** Peso, sexo e idade saem de dados observados: cargas
reportadas e resultados de competição. Altura não tem equivalente. Não existe base pública de padrões de força
por altura, e nenhum sistema de pontuação em uso — Wilks, DOTS, IPF GL — usa altura. Montar uma tabela seria
apresentar chute com cara de dado.

O que dá para fazer honestamente é um modelo mecânico, derivado à vista. A dois corpos de mesma massa, o mais
alto tem membros mais longos e mais finos: a secção transversal do músculo cai com 1/altura, e como o braço de
alavanca da carga e o do músculo crescem juntos, eles se cancelam no torque. Sobra `1RM esperado ∝ 1/altura`, a
peso constante. Corpos reais não são geometricamente semelhantes, então o expoente é amortecido para 0,6 e o
efeito é limitado a ±8%. Cada levantamento responde diferente: agachamento sente inteiro, terra sente metade —
braço longo encurta o percurso e compensa a perna longa.

O ajuste aparece na tela toda vez que muda alguma coisa ("altura −7,2%, típica no seu peso: 174 cm") e **tem
interruptor em Ajustes**. Desligado, a comparação usa só o que é observado.

**5. Percentil.** Os limiares ancoram em percentis (Iniciante ≈ 5, Novato ≈ 20, Intermediário ≈ 50, Avançado ≈ 80,
Elite ≈ 95) e o valor entre eles é interpolado; fora da faixa, satura suavemente.

**Os desenhos.** Cada exercício mostra um boneco de traço de perfil, montado em duas partes: a **pose**, que é um
conjunto de articulações, e o **equipamento**, desenhado depois na posição da mão. São 36 poses para 206
exercícios porque o que muda entre supino com barra, com halter, no Smith e na máquina é o equipamento, não o
movimento. Em desenvolvimento, `/?figuras=1` mostra os 36 lado a lado — desenho se confere olhando, e os testes
garantem que todo exercício chega a uma pose, que nenhuma pose fica órfã e que os movimentos que se confundem
(rosca × rosca de punho, remada × remada alta, agachamento × búlgaro) não compartilham figura.

**O que isso é e o que não é.** São referências de população treinada que reporta as próprias cargas — a mesma
natureza dos grandes bancos públicos de levantamento. Não é medição de laboratório nem amostra da população
geral: quem registra carga em app já é, em média, mais forte que a média. Trate como régua de acompanhamento e
motivação, não como dado científico.

---

## De onde vem cada número

A regra do projeto: **nada é apresentado sem procedência, e lacuna não é preenchida com estimativa silenciosa.**

| O que aparece na tela | De onde vem | O que isso vale |
|---|---|---|
| Macros de produto embalado | Open Food Facts, cadastrado da embalagem | Declaração do fabricante, transcrita por colaborador |
| Marcadores "ALTO EM" | ANVISA, RDC 429/2020 e IN 75/2020 | Limiar legal, número exato, calculado no aparelho |
| "Fonte de proteína", "alto em fibras" | ANVISA, RDC 54/2012 | Critério declarado na tela, não alegação de rótulo |
| Grupo NOVA | Guia Alimentar / Open Food Facts | Grau de processamento, não composição |
| Macros da tabela de alimentos | TACO e rótulos usuais | Valor médio — produto específico pede o rótulo |
| Macros por foto | Estimativa do Claude | Chute informado, com confiança por item e sempre editável |
| Padrões de força por peso, sexo, idade | Cargas reportadas e coeficientes master | Referência de população treinada |
| Ajuste por altura | Modelo mecânico do próprio app | Derivação declarada, ±8%, desligável |

Três consequências práticas no código:

- **Ausente nunca vira zero.** Nutriente que a base não informa entra como `null`, fica fora da avaliação e é
  listado na tela. Um produto sem sódio declarado não é um produto sem sódio.
- **A avaliação de rótulo não passa por modelo de linguagem.** Os limiares são norma publicada; trocar uma regra
  verificável por um palpite bem escrito seria perder o que interessa.
- **Leitura de código de barras é conferida antes de virar consulta.** O dígito verificador do EAN é validado no
  aparelho, então "não encontrei" quer dizer que o produto não está na base — não que a câmera leu errado.

### O que é testado

`npm test` roda 24 verificações sobre as partes que erram em silêncio: conversão de sódio de grama para
miligrama, energia em kJ virando kcal, ausência virando `null`, limiar de líquido contra o de sólido, açúcar de
fruta não sendo acusado de açúcar adicionado, dígito verificador contra códigos EAN publicados, e o fator de
altura respeitando o teto e a direção. São os erros que passariam despercebidos numa olhada na tela.

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
│   ├── produtos.ts         código de barras: validação, Open Food Facts e leitura da resposta
│   ├── rotulo.ts           avaliação do produto pelos limiares da ANVISA (determinística)
│   ├── figuras.ts          qual desenho representa cada exercício + coordenadas das poses
│   ├── forca.ts            1RM, carga do sistema, nível, percentil, progressão
│   ├── nutricao.ts         TMB/TDEE, metas, totais, recomendação local
│   ├── gamificacao.ts      XP, níveis, streak, 26 conquistas
│   ├── store.ts            estado (zustand + persist) e seletores
│   ├── imagem.ts           redimensionamento antes do envio
│   └── nativo.ts           câmera, armazenamento, háptico e HTTP nativo (Capacitor)
├── components/             UI, analisador de foto, scanner, conexão Claude, gráficos, coach
└── pages/                  Hoje · Nutrição · Treino · Ranking · Ajustes · Onboarding

ios/                        projeto Xcode (Capacitor) — abra com `npm run ios`
loja/                       ficha da App Store, privacidade, notas de revisão, guia
scripts/                    testes, smoke test, capturas da loja, build de página única
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
- A tabela de alimentos usa valores médios. Produto industrializado específico: escaneie o código de barras.
- O Open Food Facts é colaborativo: pode não ter o produto, ter campo faltando ou valor desatualizado. O app
  mostra a data do registro e o link da ficha, e deixa tudo editável antes de salvar — mas confira a embalagem
  quando o número importar.
- Percentis de força são referência de população treinada, não medição clínica.
- Ápice não é ferramenta de saúde. Condição clínica, dieta terapêutica, lesão ou dor persistente pedem
  profissional habilitado.
