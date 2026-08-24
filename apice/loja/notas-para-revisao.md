# Notas para a App Review

Cole no campo **App Review Information › Notes** do App Store Connect.

O ponto sensível desta submissão é que a análise por foto depende de uma chave de API
que o usuário fornece. Se o revisor abrir o app, tocar em "Foto" e vir só um aviso
pedindo configuração, ele conclui que o app está incompleto e rejeita por
**Guideline 2.1 — App Completeness**. As notas abaixo existem para evitar exatamente
isso: forneça uma chave de teste.

Ajuda que o **scanner de código de barras funciona sem chave nenhuma** — é o caminho
mais curto para o revisor ver o app fazendo algo real logo de cara, e vale deixar isso
explícito nas notas.

> **Antes de enviar:** escaneie um produto seu, confirme que a ficha aparece e cole o
> código dele nas notas, no lugar indicado. Um código que você testou vale mais do que
> um sugerido — a base é colaborativa e a cobertura muda com o tempo.

---

## Texto para colar

```
IDIOMA
O app é em português do Brasil.

CONTA
Não é necessário criar conta. Não há login, cadastro nem compras no app.

COMO TESTAR O SCANNER DE PRODUTO (não precisa de chave nem de conta)
1. Abra o app e conclua o onboarding (qualquer dado serve)
2. Aba "Comida" > botão "Código"
3. Aponte a câmera para o código de barras de qualquer produto embalado, ou
   toque em "Digitar o código" e informe o número impresso na embalagem
   (código já testado por nós: [COLE AQUI UM CÓDIGO QUE VOCÊ CONFERIU])
4. O app consulta a base pública Open Food Facts e mostra a tabela
   nutricional, os ingredientes e a avaliação pelos limiares da rotulagem
   frontal brasileira (ANVISA, RDC 429/2020)

Se o produto testado não estiver na base, o app informa isso claramente em vez
de estimar.

COMO TESTAR A ANÁLISE POR FOTO (recurso que usa IA)
Este recurso usa a API da Anthropic (Claude) autenticada por uma chave que o
próprio usuário fornece. Para o teste, preparamos uma chave com limite de gasto:

1. Abra o app e conclua o onboarding (qualquer dado serve)
2. Vá em Ajustes › Conectar Claude
3. Cole a chave: [COLE AQUI A CHAVE DE TESTE]
4. Toque em "Testar conexão" e depois em "Salvar"
5. Volte para a aba "Comida" e toque em "Foto"
6. Fotografe qualquer prato de comida, ou escolha uma foto de comida da galeria
7. A análise leva alguns segundos e retorna os alimentos com calorias e macros

O mesmo vale para o coach (botão redondo no canto inferior direito).

O APP FUNCIONA SEM A CHAVE
Se preferir não usar a chave, todo o restante funciona normalmente e sem qualquer
conexão externa: registro de refeições pela tabela de 124 alimentos, registro de
treino com 206 exercícios, comparação de força, gráficos, recordes e conquistas.

DADOS E PRIVACIDADE
O app não tem servidor. Todos os dados ficam no aparelho. Quando o usuário usa a
análise por foto, a imagem vai do aparelho direto para api.anthropic.com,
autenticada pela chave do próprio usuário. Nenhum dado passa por infraestrutura do
desenvolvedor, e nada é coletado.

CONTEÚDO GERADO POR IA
As respostas do coach e as recomendações nutricionais são geradas pelo Claude e
passam pelos filtros de segurança da Anthropic. O app não permite entrada livre de
conteúdo por terceiros nem tem componente social — não há como um usuário expor
outro a conteúdo.

SAÚDE
O app exibe avisos de que não é ferramenta clínica: no rodapé de Ajustes e na
descrição da App Store. Não faz diagnóstico, não prescreve dieta terapêutica e não
trata condição de saúde.

PERMISSÕES
- Câmera: só ao tocar em "Tirar foto" na tela de análise de refeição
- Galeria: só ao tocar em "Escolher da galeria"
Recusar ambas não impede o uso do app.
```

---

## Antes de enviar, confira

- [ ] A chave de teste foi criada **especificamente para a revisão**, com limite de
      gasto baixo (US$ 5 resolve) no console da Anthropic
- [ ] A chave está válida — teste você mesmo pelo app antes de submeter
- [ ] Anote para revogar a chave depois que o app for aprovado
- [ ] A URL da política de privacidade está publicada e abre
- [ ] A URL de suporte está publicada e abre

## Se a rejeição vier mesmo assim

**"O app requer uma chave de API de terceiros" (Guideline 2.1 ou 3.2.2)** — responda no
Resolution Center explicando que (a) o app é integralmente funcional sem a chave, que é
opcional e melhora um recurso entre vários; (b) o usuário contrata a Anthropic
diretamente, sem pagamento intermediado pelo app, o que não configura compra digital
sujeita a In-App Purchase; (c) a chave de teste foi fornecida nas notas. Aponte quais
recursos funcionam sem ela.

**"Conteúdo gerado por IA sem moderação" (Guideline 1.2)** — explique que o conteúdo é
gerado pelo Claude com os filtros de segurança da Anthropic, que não existe conteúdo
gerado por usuários nem componente social, e que o escopo do coach é restrito a treino
e alimentação pelo prompt do sistema.

**"Alegações de saúde" (Guideline 1.4.1)** — aponte os avisos no app e na descrição, e
que o app registra e estima, sem diagnosticar nem prescrever.
