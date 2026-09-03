---
name: jarvis
description: Abre o turno operacional da loja — estado da trava, integridade do log e o que está liberado. Use quando o usuário pedir para "abrir o JARVIS", ver o estado da operação, triar e-mail de cliente, checar se um reembolso ou gasto em anúncio cabe nos tetos, ou registrar uma ação no log.
allowed-tools: [Bash, Read, Grep, Glob]
---

# JARVIS — turno operacional

## Sempre comece por aqui

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/verificar.mjs
```

Isso devolve o modo (somente-leitura ou operacional), a integridade do log e o
que cada capacidade ainda exige. A saída é a base da linha de abertura que o
prompt exige.

**Se a cadeia do log estiver quebrada, pare.** Log adulterado é incidente, não
detalhe. Relate e não execute mais nada até uma pessoa decidir o que fazer.

À saída do script, acrescente a parte que ele não alcança: **quais integrações
responderam**. O script não enxerga as ferramentas MCP; só você, dentro da
sessão, sabe se o Gmail e o Shopify de fato responderam. Verifique com uma
chamada de leitura barata antes de afirmar que respondeu — ferramenta listada
não é ferramenta que respondeu.

Formato da linha:

> Integrações: e-mail e Shopify responderam; TikTok, YouTube, vídeo e telefonia
> não estão conectados. Trava ATIVA — modo somente-leitura.

## Antes de qualquer reembolso

Nunca some reembolsos de cabeça e nunca confie em memória de sessão — o
acumulado sai do log, que é a única fonte que sobrevive a um reinício.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/registrar.mjs --avaliar-reembolso 149
```

Devolve permitido/negado **com o número**: "negado" sozinho faz a pessoa
insistir; "negado, já saíram R$ 298 de R$ 400 hoje" faz ela decidir. Saída 0
quando cabe, 1 quando não.

Você avalia; você não executa. O reembolso em si é do usuário.

## Antes de qualquer gasto em anúncio

Mesma regra, mesmo motivo — o acumulado do mês e do dia sai do log:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/registrar.mjs --avaliar-ads 80
```

O teto do dia é o dia local do fuso configurado; o do mês é o mês de calendário,
que é como a plataforma cobra. E o gasto **só entra na conta quando alguém
registra** `ads.gasto` — se a compra sair sem registro, o teto não a enxerga.
Registre logo depois de a compra ser confirmada, com o valor real cobrado:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/registrar.mjs \
  --acao ads.gasto --modo confirmada --por kaua --dados '{"valor":80,"campanha":"..."}'
```

## Registrar o que você fez

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/registrar.mjs \
  --acao email.triagem --modo autonoma --dados '{"lidos":42,"de_cliente":9}'
```

Ação de Nível 3 exige `--modo confirmada --por <quem>`. O script recusa
`confirmada` sem quem confirmou, porque essa é justamente a linha que alguém vai
querer conferir depois.

Registre o que teve efeito: triagem concluída, rascunho criado, relatório
entregue. Não registre cada leitura — log que registra tudo não é lido por
ninguém.

## Fila de aprovação

Ação de Nível 3 não se descreve em prosa e se espera que o usuário lembre — vai
para a fila:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/registrar.mjs \
  --enfileirar reembolso --dados '{"valor":120,"pedido":"#1042"}' --prioridade P2
node ${CLAUDE_PLUGIN_ROOT}/scripts/registrar.mjs --pendencias
```

Sempre liste as pendências abertas na abertura do turno, com o tempo de espera.
Pendência esquecida na fila é pior que pendência recusada.

## A rampa da publicação automática

Não conte lotes de cabeça e não peça o número ao usuário — ele é derivado do log:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/registrar.mjs --lote aprovado --por kaua
node ${CLAUDE_PLUGIN_ROOT}/scripts/registrar.mjs --lote alterado --por kaua
```

Registre `alterado` sempre que o usuário mudar **qualquer coisa** no lote antes
de aprovar, por menor que seja — a contagem zera, e é assim que a rampa mede o
que devia medir. Arredondar isso para "aprovado com um ajustezinho" esvazia a
única salvaguarda que a publicação automática tem.

Mesmo com a rampa fechada, a publicação continua bloqueada até uma pessoa virar
`publicacao_automatica_liberada` para `true`. Você não edita esse campo.

## Escalonamento

Antes de notificar qualquer coisa, agregue por causa-raiz e passe pelo
planejador — ele decide o canal, respeita a janela de silêncio e o teto por
hora, e explica quando não notifica:

```js
import { agregar, planejarNotificacao } from './escalonamento.mjs'
```

Nunca decida por conta própria que algo é importante o bastante para furar o
silêncio. Quem decide isso é a lista `categorias_que_furam_silencio`.

## Triagem de e-mail

A lista de intenções que podem virar rascunho pronto, e os sete gatilhos de
interrupção obrigatória, estão em `agents/jarvis.md`. O resumo operacional:

- Só status de pedido, prazo, política de troca, FAQ e confirmação de recebimento
- **Não redija** e escale se houver: Procon ou advogado; saúde ou lesão; acusação
  de fraude; jornalista ou influenciador; pedido de reembolso; segunda mensagem
  sobre assunto não resolvido; raiva explícita ou ameaça de exposição

Leia a mensagem inteira antes de classificar. Cliente irritado descrevendo
problema sério parece consulta de status até a segunda frase.

## Preencher a configuração

`config/jarvis.config.json`. Cada campo destravado abre uma capacidade
específica — não existe chave geral. Depois de editar, rode `verificar.mjs` de
novo para confirmar o que abriu.

## Rodar os testes

```bash
node --test ${CLAUDE_PLUGIN_ROOT}/scripts/testes.mjs   # 47 testes
```

Este código autoriza dinheiro e decide quem é acordado. Se você mexer nos limites ou no log, rode.
