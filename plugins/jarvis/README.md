# JARVIS

Assistente operacional de e-commerce para Claude Code. A ideia central: **a
autonomia é ordenada por reversibilidade, não por valor** — um reembolso de
R$ 300 se estorna em um clique; um vídeo ruim publicado já foi baixado, printado
e repostado.

O que distingue este plugin de um prompt bem escrito é que as três regras que
mais custam caro quando falham estão em código, não em texto:

| Regra | Onde vive | O que acontece se o modelo esquecer |
|---|---|---|
| Trava de configuração | `scripts/config.mjs` | Nada. A capacidade continua bloqueada. |
| Tetos acumulados de reembolso | `scripts/limites.mjs` | Nada. O cálculo sai do log, não da memória. |
| Log inviolável | `scripts/log.mjs` | A cadeia de hash quebra e a verificação denuncia. |

Um limite que só existe no prompt depende do modelo lembrar dele — e a hora em
que ele mais precisa lembrar é justamente a hora em que alguém está pedindo com
urgência para abrir uma exceção.

## Estrutura

```
jarvis/
├── config/jarvis.config.json   limites; enquanto tiver ____, é somente-leitura
├── agents/jarvis.md            o subagente, com lista de ferramentas só de leitura
├── skills/jarvis/SKILL.md      o turno operacional, invocável por /jarvis
├── scripts/
│   ├── config.mjs              lê a config e decide o que está liberado
│   ├── limites.mjs             tetos por pedido, por dia e por semana corrida
│   ├── log.mjs                 append-only com cadeia de hash
│   ├── verificar.mjs           a linha de abertura exigida pelo prompt
│   ├── registrar.mjs           CLI de registro e de avaliação de reembolso
│   └── testes.mjs              18 testes do que decide dinheiro
└── log/acoes.jsonl             o registro (fora do git — é dado da operação)
```

## Começando

```bash
node scripts/verificar.mjs          # o que está travado e por quê
node --test scripts/testes.mjs      # 18 testes
```

Na primeira execução tudo está bloqueado, e isso é o comportamento correto:
`config/jarvis.config.json` vem com todos os limites em branco.

## A trava é por capacidade

Não existe uma chave geral. Quem preencheu os limites de dinheiro mas não
definiu a janela de silêncio pode reembolsar sem poder ligar de madrugada.

A granularidade é deliberada: uma trava única faria o usuário preencher qualquer
coisa só para destravar o resto — que é exatamente como um limite vira ficção.

| Capacidade | Exige |
|---|---|
| `reembolso` | moeda + os três tetos |
| `anuncios` | moeda + orçamento do mês + teto do dia |
| `escalonamento` | fuso, janela de silêncio, e-mail, exemplos de P1 e P2 |
| `ligacao` | telefone de emergência |
| `publicacao` | 5 lotes aprovados sem nenhuma alteração |

## Os tetos de reembolso

Três, e valem juntos: por pedido, por dia e **por semana corrida** — últimos 7
dias, não a semana do calendário, porque semana de calendário cria a
segunda-feira em que tudo é permitido de novo.

O acumulado existe porque o teto por transação sozinho não segura nada: dez
reembolsos de R$ 149 são R$ 1.490 sem uma confirmação sequer.

```bash
$ node scripts/registrar.mjs --avaliar-reembolso 149
{
  "permitido": false,
  "motivo": "estoura o teto do dia — já saíram BRL 298.00 de BRL 400.00",
  "gastos": { "dia": 298, "semana": 298 }
}
```

Sempre com o número. "Negado" sozinho faz a pessoa insistir; "negado, faltam
R$ 102" faz ela decidir.

## O log

Cada linha carrega o hash da anterior. Apagar ou alterar qualquer registro
quebra a cadeia de todos os seguintes, e a quebra aparece na verificação.

Isso não impede a edição — impede a edição **silenciosa**, que é o que importa:
um log adulterado deixa de ser um log e passa a ser um alarme.

```
adulterou um valor  → {"intacta":false,"linha":3,"motivo":"conteúdo alterado depois de gravado"}
apagou uma linha    → {"intacta":false,"linha":2,"motivo":"elo anterior não confere"}
```

O módulo não exporta nenhuma função de apagar ou editar, e há um teste que
verifica isso: o que não tem API não é chamado por engano.

## Limites conhecidos

- **Telefonia e SMS não existem aqui.** A escada de escalonamento termina em
  push e e-mail. Ligação exige integração de telefonia, que é trabalho separado.
- **TikTok, YouTube e geração de vídeo não estão conectados.** O agente é
  instruído a dizer isso em vez de descrever uma publicação que não aconteceu.
- **A cadeia de hash é à prova de adulteração silenciosa, não de adulteração.**
  Quem controla o arquivo pode reescrever a cadeia inteira. Para além disso,
  o log precisa sair da máquina — append-only remoto ou storage com retenção.
- **O agente não executa reembolso.** Ele avalia e apresenta. A execução é sua.
