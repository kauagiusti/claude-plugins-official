# Ganhar dinheiro com o Ápice

Análise honesta do caminho, das contas e das chances. Escrito para ser relido quando
você estiver decidindo se vale continuar.

---

## O problema que precisa ser resolvido antes de tudo

**Do jeito que o app está hoje, ele não vende.**

O Ápice pede que a pessoa crie conta na Anthropic, adicione crédito, gere uma chave de
API e cole no app. Isso é aceitável para você e para desenvolvedores. Para o público
que paga por app de dieta, é barreira intransponível — a conversão nesse fluxo é
próxima de zero.

Todo app comparável (Cal AI, MyFitnessPal, MacroFactor) esconde isso: a chave é do
desenvolvedor, o usuário paga assinatura e nunca ouve falar em API.

Então o primeiro trabalho não é marketing. É trocar a arquitetura:

```
hoje:    iPhone → (chave do usuário) → Anthropic
precisa: iPhone → seu backend → (sua chave) → Anthropic
                      ↑
              valida a assinatura antes de deixar passar
```

Sem esse backend não existe assinatura, porque sem ele qualquer pessoa usa de graça.

---

## As contas que decidem tudo

### Quanto custa cada análise

Uma foto analisada gasta aproximadamente 2.200 tokens de entrada (imagem de 1024 px +
prompt + contexto do dia) e 2.000 de saída (JSON estruturado + raciocínio do modelo).

| Modelo | Custo por análise | 60 análises/mês | 90 análises/mês |
|---|---:|---:|---:|
| Opus 5 | US$ 0,061 | R$ 20,13 | R$ 30,20 |
| Sonnet 5, esforço médio | US$ 0,037 | R$ 12,21 | R$ 18,31 |
| **Sonnet 5, esforço baixo** | **US$ 0,021** | **R$ 6,93** | **R$ 10,40** |
| Haiku 4.5 | US$ 0,012 | R$ 3,96 | R$ 5,94 |

*Câmbio de R$ 5,50. Refaça a conta quando o câmbio ou o preço mudar.*

### Quanto sobra por assinante

Preço de R$ 29,90/mês, Apple ficando com 15% (Small Business Program, para quem fatura
menos de US$ 1M/ano — **inscreva-se, o padrão é 30%**):

| Modelo, com 60 análises/mês inclusas | Sobra por assinante |
|---|---:|
| Opus 5 | R$ 5,28 |
| Sonnet 5, esforço médio | R$ 13,21 |
| **Sonnet 5, esforço baixo** | **R$ 18,48** |
| Haiku 4.5 | R$ 21,45 |

**Leia essa tabela com atenção: com Opus 5 e uso ilimitado você perde dinheiro em cada
assinante.** A 90 análises/mês o custo (R$ 30,20) já supera o líquido da assinatura
(R$ 25,41). O produto que você tem hoje, monetizado ingenuamente, dá prejuízo
proporcional ao sucesso.

As duas alavancas reais:

1. **Baixar o `effort` para `low` na análise.** O raciocínio do modelo é metade do
   custo de saída. Em foto de comida ele ajuda pouco — a tarefa é reconhecimento, não
   dedução. Isso sozinho corta ~45% do custo.
2. **Limitar análises por plano.** Não por avareza: quem usa 5×/dia é minoria e é
   exatamente quem quebra a margem.

### Quantos assinantes para cada meta

Com R$ 18,48 líquidos por assinante e conversão de 3% (típica em apps de fitness):

| Meta líquida | Assinantes | Usuários gratuitos |
|---|---:|---:|
| R$ 2.000/mês | 108 | ~3.600 |
| R$ 5.000/mês | 270 | ~9.000 |
| R$ 10.000/mês | 541 | ~18.000 |
| R$ 30.000/mês | 1.623 | ~54.000 |

---

## O problema de aquisição, que é pior que o de custo

CAC de app de fitness no Brasil via Meta Ads: **R$ 5 a R$ 20 por instalação**. A 3% de
conversão, cada assinante custa entre **R$ 170 e R$ 670** para adquirir.

O LTV, a R$ 18,48/mês com retenção média de 6 meses (otimista para app de dieta), é
**R$ 110**.

**CAC maior que LTV significa que tráfego pago não fecha a conta.** Cada real gasto em
anúncio volta como menos de um real. Isso não é pessimismo — é a razão de a maioria dos
apps de dieta independentes morrer.

Sobra o canal orgânico:

- **ASO** (o que a pessoa digita na busca da App Store)
- **Conteúdo curto** — TikTok, Reels, Shorts. Foi assim que o Cal AI cresceu, não com
  anúncios
- **Comunidade** — grupos de treino, Discord, academia física
- **Boca a boca**, que é o único que escala sozinho

Isso muda o trabalho: **o gargalo não é código, é distribuição.** Você vai passar mais
tempo gravando vídeo do que programando. Se isso não te atrai, vale saber agora.

---

## Passo a passo

### Fase 0 — Validar antes de construir (2 a 4 semanas)

Não construa o backend ainda. Descubra se alguém quer.

1. **Publique como PWA**, hoje. `dist/` na Vercel, link curto, funciona no celular.
2. **Coloque na mão de 30 a 50 pessoas** — academia, grupos de WhatsApp, Instagram.
   Você banca a API nesse período; com 50 pessoas testando é custo de dezenas de reais.
3. **Meça três coisas**, e só três:
   - Quantos usam no 7º dia (retenção D7). Abaixo de 20% o produto não segura
   - Quantas análises por pessoa por semana
   - Quantos perguntam **espontaneamente** quanto custa
4. **Pergunte diretamente:** "você pagaria R$ 29,90 por mês?" A resposta verbal é
   inflada; o sinal real é quem pergunta o preço sem você trazer o assunto.

**Critério de parada:** se D7 ficar abaixo de 20% depois de duas rodadas de ajuste, o
problema é o produto. Construir backend e paywall em cima disso é jogar dinheiro fora.

### Fase 1 — Backend e assinatura (4 a 8 semanas)

Só depois que a Fase 0 der sinal.

1. **Backend proxy.** Um endpoint que recebe a foto, valida a assinatura, chama a
   Anthropic com a sua chave e devolve o JSON. Node ou Python numa Cloudflare
   Worker/Vercel/Fly resolve.
2. **Autenticação.** Sign in with Apple — obrigatório se você oferecer outro login
   social, e é o de menor atrito no iOS.
3. **Contador de uso por usuário**, com limite por plano. Isso protege sua margem.
4. **Assinatura via In-App Purchase.** Não tem escolha: conteúdo digital consumido
   dentro do app **tem** que passar pelo IAP da Apple. Cobrar por Pix ou Stripe dentro
   do app é remoção certa. Use RevenueCat (grátis até US$ 2,5k/mês de receita) — ele
   resolve recibo, renovação e cancelamento, que é onde se perde semanas.
5. **Baixe o `effort` para `low`** na análise e meça se a qualidade cai de verdade.

### Fase 2 — Preço e planos

Sugestão para começar:

| Plano | Preço | O que inclui |
|---|---|---|
| Grátis | R$ 0 | Treino completo, ranking de força, tabela de alimentos, 5 análises/mês |
| Pro | R$ 29,90/mês ou R$ 199/ano | 100 análises/mês, coach ilimitado |

O plano grátis é generoso de propósito: **treino e ranking de força não custam nada
para você** — rodam no aparelho. Eles seguram o usuário até ele querer a foto. É a sua
maior vantagem estrutural sobre o Cal AI, que precisa cobrar por tudo porque tudo dele
custa API.

O anual a R$ 199 (44% de desconto) é o que salva a retenção: app de dieta perde metade
dos assinantes mensais em 3 meses.

### Fase 3 — Lançamento e distribuição

1. **ASO.** Título e subtítulo já estão em `ficha-app-store.md`. Palavra-chave que
   ninguém disputa e que é a sua: *nível de força*, *percentil*, *1RM*.
2. **20 vídeos antes de lançar.** Uma tomada de foto do prato → números aparecendo. E
   uma série sendo registrada → "top 26% mundial". A segunda é mais rara e por isso
   mais compartilhável.
3. **Peça avaliação no momento certo** — depois da 5ª análise salva, nunca na abertura.
4. **Primeiros 100 assinantes você atende um a um.** É o único jeito de descobrir por
   que os outros 900 não assinaram.

---

## O app é lucrativo em relação às alternativas?

### Onde ele se encaixa

| App | Preço | Foto | Treino | Percentil de força | Comida BR |
|---|---|:-:|:-:|:-:|:-:|
| **Cal AI** | ~US$ 10/mês | ✅ | ❌ | ❌ | ❌ |
| **MyFitnessPal** | R$ 40+/mês | ✅ | parcial | ❌ | parcial |
| **MacroFactor** | ~US$ 12/mês | ❌ | ❌ | ❌ | ❌ |
| **TecnoNutri** | ~R$ 25/mês | ❌ | ❌ | ❌ | ✅ |
| **Hevy / Strong** | R$ 25/mês | ❌ | ✅ | ❌ | — |
| **Strength Level** | site | ❌ | ❌ | ✅ | — |
| **Ápice** | R$ 29,90/mês | ✅ | ✅ | ✅ | ✅ |

Você é o único na última linha inteira. Isso é real e não é pouco.

### O que joga a favor

- **A categoria está provada.** O Cal AI saiu de zero a dezenas de milhões de dólares
  em cerca de um ano com foto de comida. A dúvida "as pessoas pagam por isso?" já foi
  respondida por outro.
- **O cruzamento é raro.** Quem faz comida não faz treino; quem faz treino não faz
  comida. Ninguém faz percentil de força dentro do app.
- **Comida brasileira é vantagem defensável.** Feijoada, pão de queijo, tapioca, açaí,
  farofa, "1 concha", "1 escumadeira". O Cal AI vai errar nisso por anos, porque não é
  problema dele resolver.
- **Custo marginal quase zero na metade do produto.** Treino e ranking rodam offline.
  Concorrente de nutrição paga API por cada interação; você não.
- **O ranking de força é conteúdo viral pronto.** "Descobri que meu supino é top 26%
  mundial" se compartilha sozinho. Contagem de calorias não.

### O que joga contra, e pesa mais

- **Mercado saturado e barato.** Contador de calorias tem centenas de opções, várias
  gratuitas e boas. Ninguém está esperando mais um.
- **Aquisição paga não fecha.** CAC acima do LTV, como mostrado acima. Se você não
  quiser ou não conseguir fazer conteúdo orgânico consistente, não há plano B.
- **Retenção em app de dieta é ruim por natureza.** Metade some em 90 dias. É
  característica da categoria, não falha sua.
- **Margem apertada e amarrada ao dólar.** Você cobra em real e paga em dólar. Uma alta
  cambial come sua margem sem você fazer nada.
- **A vantagem de idioma tem prazo.** No dia em que o Cal AI decidir traduzir e comprar
  tráfego no Brasil, ele faz isso em um trimestre.
- **É um app sério competindo com apps que prometem mágica.** Você mostra grau de
  confiança e diz "confira antes de salvar". O concorrente mostra um número redondo e
  cala a boca. O honesto costuma converter pior — e é o certo mesmo assim.

### Meu palpite

**Como negócio principal, é aposta ruim.** A probabilidade de virar renda que substitui
um salário é baixa — não pelo produto, que está bom, mas porque o funil exige milhares
de usuários e o único canal viável é o orgânico, que é lento e depende de você virar
criador de conteúdo.

**Como renda paralela construída com paciência, é aposta razoável.** R$ 2.000 a
R$ 5.000/mês são 100 a 270 assinantes. Isso é alcançável em 12 a 18 meses com esforço
constante em conteúdo. Não é pouco dinheiro e o custo de manutenção é baixo depois de
pronto.

**A alternativa que quase ninguém considera: venda para quem já tem público.** Personal
trainers e nutricionistas pagam mais por aluno e trazem os alunos junto. Um painel onde
o profissional acompanha 30 alunos a R$ 149/mês são R$ 4.470/mês com 30 clientes em vez
de 18.000 usuários. Margem melhor, CAC menor, e — detalhe importante — **vendido pela
web, sem os 15% da Apple e com Pix**. O app que você já tem é 80% disso.

Se me pedissem para escolher um caminho: **valide na Fase 0, e se o sinal vier, teste
B2B com dez personais antes de construir o backend de consumidor.** O sinal vem mais
rápido e o dinheiro por cliente é 5× maior.

---

## O que não fazer

- **Não construa o backend antes da Fase 0.** É o erro mais caro e o mais comum.
- **Não lance com Opus 5 e uso ilimitado.** Você paga para o usuário usar.
- **Não cobre fora do IAP dentro do app.** É remoção, não advertência.
- **Não prometa precisão que a foto não entrega.** Além de errado, gera reembolso e
  avaliação de uma estrela — que custa mais caro que a assinatura ganha.
- **Não gaste em anúncio antes de a retenção D7 passar de 20%.** Anúncio em produto que
  não segura é o jeito mais rápido de perder dinheiro.
