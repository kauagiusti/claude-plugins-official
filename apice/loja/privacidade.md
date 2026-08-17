# Política de Privacidade — Ápice

**Última atualização:** 17 de agosto de 2026

> Substitua `[SEU E-MAIL]` e `[SEU NOME OU EMPRESA]` antes de publicar, e hospede
> esta página numa URL pública — o App Store Connect exige o endereço.

## Resumo

O Ápice não tem servidor, não tem cadastro e não coleta seus dados. Tudo o que você
registra fica no seu iPhone. Não vendemos, compartilhamos nem transmitimos suas
informações para nós — porque não existe um "nós" do outro lado recebendo nada.

## O que o app guarda, e onde

Ficam salvos **exclusivamente no seu aparelho**, no armazenamento protegido do app:

- Perfil: nome, sexo biológico, data de nascimento, altura, peso e percentual de gordura
- Refeições registradas, alimentos, quantidades e valores nutricionais
- Miniaturas das fotos de refeição dos últimos 21 dias
- Treinos, exercícios, séries, cargas e repetições
- Histórico de peso corporal
- Conquistas, pontos de experiência e sequência de dias
- Sua chave da Claude API, quando você opta por configurá-la
- Conversas com o coach

Nada disso sai do aparelho por iniciativa do app. Desinstalar o Ápice apaga tudo.
Você pode exportar seus dados em JSON a qualquer momento, em Ajustes › Dados.

## Quando algo sai do aparelho

Existe **uma única** situação: quando você usa a análise de refeição por foto ou
conversa com o coach.

Nesses casos, o app envia diretamente para a API da Anthropic (`api.anthropic.com`),
por conexão criptografada:

- **Na análise por foto:** a foto da refeição e os números do seu dia (metas de
  calorias e macros, e o quanto você já consumiu), para que a estimativa considere
  o contexto.
- **No coach:** sua pergunta e um resumo dos seus números — metas, consumo do dia,
  treinos recentes e recordes.

Esses dados vão **do seu iPhone direto para a Anthropic**, autenticados pela chave de
API que é sua. Não passam por nenhum servidor do Ápice. O desenvolvedor do Ápice não
tem acesso a essas fotos, a essas conversas nem a esses números.

O uso desses dados pela Anthropic é regido pela política de privacidade e pelos termos
comerciais dela: https://www.anthropic.com/legal/privacy

Se você nunca configurar uma chave de API, **nenhuma informação sai do aparelho em
nenhuma hipótese**. O restante do app — tabela de alimentos, registro de treino,
comparação de força, gráficos e conquistas — funciona integralmente offline.

## Sua chave de API

A chave que você cola em Ajustes é guardada no armazenamento do app, no aparelho, e
usada apenas para autenticar as chamadas descritas acima. Ela nunca é enviada para
outro destino.

Recomendamos criar uma chave dedicada ao Ápice, com limite de gasto configurado no
console da Anthropic. Você pode removê-la do aparelho a qualquer momento em
Ajustes › Conectar Claude › Remover chave deste aparelho.

## Câmera e fotos

O app pede acesso à câmera e à galeria **apenas** quando você escolhe fotografar ou
selecionar uma imagem de refeição. As imagens são usadas para a estimativa nutricional
e guardadas como miniatura no seu histórico. Recusar as permissões não impede o uso do
app: você continua registrando refeições pela tabela de alimentos.

## Rastreamento e publicidade

O Ápice **não** rastreia você. Não há anúncios, analytics, SDKs de terceiros, cookies
de rastreio, identificador de publicidade nem qualquer forma de perfilamento. O app não
usa a App Tracking Transparency porque não tem o que pedir.

## Crianças

O app não é direcionado a menores de 13 anos e não coleta dados de ninguém — de nenhuma
idade.

## Seus direitos (LGPD e GDPR)

Como não coletamos nem armazenamos seus dados em servidor nenhum, não há base de dados
nossa para acessar, corrigir ou excluir. O controle é integralmente seu:

- **Acesso e portabilidade:** exporte tudo em JSON em Ajustes › Dados
- **Exclusão:** apague tudo em Ajustes › Dados, ou desinstale o app
- **Dados enviados à Anthropic:** trate diretamente com a Anthropic, titular do
  processamento nesse trecho

## Mudanças nesta política

Alterações relevantes serão publicadas nesta página, com a data de atualização
revisada, e acompanharão uma nova versão do app.

## Contato

[SEU NOME OU EMPRESA]
[SEU E-MAIL]
