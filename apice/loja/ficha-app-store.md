# Ficha do App Store Connect

Textos prontos para colar. Os limites da Apple estão anotados; contagens conferidas.

---

## Nome
*(máx. 30 caracteres)*

```
Ápice
```

## Subtítulo
*(máx. 30 caracteres — 29 usados)*

```
Nutrição por foto e força
```

## Texto promocional
*(máx. 170 caracteres · pode ser trocado sem nova revisão)*

```
Fotografe a refeição e receba calorias e macros na hora. Registre a série e veja seu nível de força comparado a quem treina.
```

## Palavras-chave
*(máx. 100 caracteres · separadas por vírgula, sem espaço depois da vírgula)*

```
dieta,calorias,macros,contador,treino,academia,musculação,força,1rm,proteína,fitness,nutrição
```

## Descrição
*(máx. 4000 caracteres)*

```
Ápice junta as duas coisas que decidem seu resultado: o que você come e o que você levanta.

FOTOGRAFE A REFEIÇÃO
Tire uma foto do prato e receba a lista de alimentos, a porção estimada em gramas e os macronutrientes de cada item. Nada de procurar código de barras ou caçar item em lista genérica — você fotografa e confere.

Cada estimativa vem com o grau de confiança e continua editável: se a porção veio maior do que era, ajuste a quantidade e os macros se recalculam junto. A leitura é ponto de partida, não veredito.

Sem vontade de fotografar? A tabela tem 124 alimentos brasileiros com porções caseiras — "1 concha", "1 escumadeira", "1 filé médio".

SAIBA SEU NÍVEL DE FORÇA
Registre a série e veja na hora onde aquela carga coloca você: nível de Iniciante a Elite, percentil comparado a quem treina, múltiplo do seu peso corporal e quantos quilos faltam para o próximo nível.

A comparação leva em conta seu peso, seu sexo e sua idade — usando os mesmos coeficientes das categorias master. Um agachamento de 140 kg significa coisas diferentes para alguém de 60 kg e para alguém de 100 kg, e o app sabe disso.

São 206 exercícios: barra, halteres, polia, máquina, Smith, peso corporal, kettlebell, elástico e cardio. Sete levantamentos têm tabela própria; os demais são convertidos pela escala equivalente, então até leg press e crucifixo entram na comparação.

METAS QUE FAZEM SENTIDO PARA VOCÊ
As metas de calorias e macros saem do seu gasto energético real, calculado por Mifflin-St Jeor — ou por Katch-McArdle, se você souber seu percentual de gordura. Dá para ajustar tudo à mão quando quiser.

RECOMENDAÇÃO NA HORA
A cada refeição registrada o app diz o que fazer com o resto do dia, com alimento e quantidade concretos. Faltou proteína e sobrou pouca refeição? Ele fala o que resolve.

PROGRESSO QUE MOTIVA
Recordes por exercício, volume semanal, evolução do peso corporal, score geral de força, níveis, sequência de dias e 26 conquistas para desbloquear.

COACH COM SEUS NÚMEROS
Pergunte o que quiser sobre treino e alimentação. O coach enxerga suas metas, seu consumo do dia, seus treinos recentes e seus recordes — as respostas são sobre você, não genéricas.

SEUS DADOS FICAM COM VOCÊ
Sem cadastro, sem conta, sem servidor. Tudo é salvo no próprio iPhone e você exporta em JSON quando quiser.

A análise por foto e o coach usam sua própria chave da Claude API (da Anthropic), que você configura em Ajustes e que fica só no seu aparelho. Você paga o uso direto para a Anthropic — o Ápice não cobra assinatura nem intermedeia pagamento. Todo o resto do app funciona sem chave nenhuma.

AVISO
Ápice é ferramenta de acompanhamento pessoal, não instrumento clínico. Estimativas nutricionais por foto têm margem de erro, e percentis de força são referências de população que treina, não medição de laboratório. Condição de saúde, dieta terapêutica, lesão ou dor persistente pedem acompanhamento de profissional habilitado.
```

## Novidades desta versão
*(versão 1.0)*

```
Primeira versão do Ápice.

• Análise de refeição por foto, com porções e macros editáveis
• 206 exercícios e comparação de força por peso, sexo e idade
• Metas calculadas pelo seu gasto energético
• Recordes, volume semanal, score de força e 26 conquistas
• Coach que conhece seus números
• Tudo salvo no seu iPhone, sem conta e sem servidor
```

---

## Campos do formulário

| Campo | Valor |
|---|---|
| Categoria principal | Saúde e fitness |
| Categoria secundária | Estilo de vida |
| Direitos autorais | `2026 <seu nome ou empresa>` |
| Classificação etária | 4+ *(sem conteúdo restrito; ver ressalva abaixo)* |
| Preço | Gratuito |
| Compras no app | Nenhuma |
| Idioma principal | Português (Brasil) |
| URL de suporte | **obrigatória** — página ou e-mail de contato |
| URL de política de privacidade | **obrigatória** — publique `loja/privacidade.html` |
| URL de marketing | opcional |

**Sobre a classificação etária:** o questionário atual pergunta se o app tem recursos de IA generativa que exibem conteúdo gerado. O coach exibe. Responda **sim** e indique que existe moderação — as respostas passam pelos filtros da Anthropic. Isso costuma manter a classificação em 4+, mas responder "não" e depois a Apple detectar o recurso é motivo de rejeição.

## Capturas de tela

Geradas por `npm run capturas` em `capturas-loja/`, já no tamanho de iPhone 6.7" (1290 × 2796), que é o obrigatório.

Ordem sugerida — a primeira é a que aparece na busca:

1. `3-nivel-de-forca.png` — é o diferencial do app
2. `2-nutricao.png` — a foto virando macros
3. `1-hoje.png` — o resumo do dia
4. `4-ranking.png` — ranking e percentis
5. `5-evolucao.png` — gráficos
6. `6-conquistas.png` — gamificação

Se quiser adicionar legendas de marketing por cima, mantenha o texto no terço superior — é o que aparece na pré-visualização da busca.
