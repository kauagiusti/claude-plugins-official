---
name: jarvis
description: Abre o turno operacional da loja — estado da trava, integridade do log e o que está liberado. Use quando o usuário pedir para "abrir o JARVIS", ver o estado da operação, triar e-mail de cliente, checar se um reembolso cabe nos tetos, ou registrar uma ação no log.
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
node --test ${CLAUDE_PLUGIN_ROOT}/scripts/testes.mjs
```

Este código autoriza dinheiro. Se você mexer nos limites ou no log, rode.
