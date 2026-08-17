# Publicar o Ápice na App Store

Guia do começo ao fim. O projeto iOS já está gerado em `ios/` — o que falta é o que só
acontece num Mac.

## O que você precisa antes de começar

| Item | Observação |
|---|---|
| Mac com macOS recente | Não tem alternativa: só o Xcode assina e envia binário iOS |
| Xcode 15 ou mais novo | Grátis na Mac App Store |
| Apple Developer Program | US$ 99/ano — sem isso não dá para publicar |
| CocoaPods | `sudo gem install cocoapods` |
| Node 18+ | Para gerar os arquivos web |
| iPhone físico | Recomendado para testar câmera e conexão de verdade |

---

## 1. Abrir o projeto no Mac

```bash
git clone <este repositório>
cd apice
npm install
npm run ios          # build + cap sync + abre o Xcode
```

`npm run ios` roda `vite build`, copia o resultado para dentro do projeto iOS,
instala os pods e abre `ios/App/App.xcworkspace`.

> Sempre que mexer no código web, rode `npm run sync` antes de buildar no Xcode.
> O Xcode não enxerga suas mudanças em `src/` sozinho — ele serve o que está em
> `ios/App/App/public`.

---

## 2. Configurar assinatura e identidade

No Xcode, selecione o target **App** e a aba **Signing & Capabilities**:

1. **Team** — sua conta do Apple Developer
2. **Bundle Identifier** — troque `com.kauagiusti.apice` pelo identificador que você
   registrar. Precisa ser igual em três lugares: aqui, em `capacitor.config.ts` e no
   App Store Connect
3. Deixe **Automatically manage signing** marcado

Na aba **General**:

4. **Display Name**: `Ápice`
5. **Version**: `1.0` · **Build**: `1`
6. **Minimum Deployments**: iOS 14.0 ou superior
7. **iPhone Orientation**: apenas *Portrait* (o app não tem layout paisagem)
8. Se não for publicar para iPad, ajuste **Supported Destinations** para só iPhone

---

## 3. Adicionar o manifesto de privacidade ao target

**Este passo é obrigatório e fácil de esquecer.** O arquivo
`ios/App/App/PrivacyInfo.xcprivacy` já existe no disco, mas precisa entrar no bundle:

1. No navegador de arquivos do Xcode, clique com o botão direito na pasta **App**
2. **Add Files to "App"…**
3. Selecione `PrivacyInfo.xcprivacy`
4. Marque **Copy items if needed** e o target **App**

Sem isso o App Store Connect recusa o binário com aviso de *missing privacy manifest*.

Para conferir: selecione o arquivo e veja se o target **App** está marcado no painel
direito (*Target Membership*).

---

## 4. Testar no iPhone

Conecte o aparelho, selecione-o na barra do Xcode e rode (⌘R). Teste especificamente:

- [ ] **Câmera** — toque em Comida › Foto › Tirar foto. O iOS deve pedir permissão com
      o texto em português que está no `Info.plist`
- [ ] **Conexão com o Claude** — Ajustes › Conectar Claude, cole sua chave e toque em
      "Testar conexão". Esta é a verificação que só o aparelho responde: a chamada sai
      pela camada nativa justamente para não depender de CORS, mas confirme
- [ ] **Análise real** — fotografe um prato e veja a estimativa voltar
- [ ] **Coach** — abra o botão redondo e faça uma pergunta. Se o texto aparecer de uma
      vez em vez de aos poucos, é a queda para o modo sem streaming; funciona igual
- [ ] **Persistência** — registre um treino, force o fechamento do app, reabra. Os
      dados têm que estar lá
- [ ] **Área segura** — confira se nada fica embaixo do notch ou da barra inferior

---

## 5. Criar o app no App Store Connect

Em [appstoreconnect.apple.com](https://appstoreconnect.apple.com) › **Meus Apps** › **+**:

- **Plataforma**: iOS
- **Nome**: `Ápice`
- **Idioma principal**: Português (Brasil)
- **Bundle ID**: o mesmo do Xcode
- **SKU**: `apice-ios-001` (identificador interno, você escolhe)

Depois preencha a ficha com os textos de [`ficha-app-store.md`](ficha-app-store.md) e
suba as capturas de `capturas-loja/` (geradas por `npm run capturas`).

---

## 6. Responder o questionário de privacidade

Em **App Privacy**, a resposta correta é a mais simples possível.

**"Você ou seus parceiros coletam dados deste app?"** → **Não**

E é verdade: o app não tem servidor, não tem analytics e não envia nada para você. Os
dados que saem do aparelho vão do iPhone do usuário direto para a Anthropic, sob a
chave dele, para prestar o serviço que ele pediu — o desenvolvedor não recebe, não
armazena e não tem acesso.

> **Se você mudar isso depois** — adicionar analytics, crash reporting, backend
> próprio ou qualquer SDK de terceiros — a resposta deixa de ser "Não" e o formulário
> precisa ser refeito. Declarar errado é uma das causas mais comuns de remoção de app.

Também preencha:

- **URL da política de privacidade** — publique [`privacidade.md`](privacidade.md)
  (há uma versão HTML pronta em [`privacidade.html`](privacidade.html)) em qualquer
  host estático e cole o endereço
- **Classificação etária** — responda o questionário; sobre IA generativa, veja a
  ressalva em `ficha-app-store.md`

---

## 7. Enviar o binário

No Xcode:

1. Selecione **Any iOS Device (arm64)** como destino
2. **Product › Archive**
3. Quando o Organizer abrir: **Distribute App › App Store Connect › Upload**
4. Deixe as opções padrão e envie

O processamento leva de alguns minutos a uma hora. Depois disso o build aparece em
**TestFlight** e pode ser selecionado na versão da loja.

---

## 8. Submeter para revisão

1. Na versão 1.0, escolha o build enviado
2. Cole as [`notas-para-revisao.md`](notas-para-revisao.md) em **App Review Information
   › Notes** — **inclusive a chave de API de teste**, ou a rejeição é quase certa
3. Preencha contato de suporte
4. **Add for Review** › **Submit**

A revisão costuma levar de 24 a 48 horas.

---

## Atualizações depois da primeira versão

```bash
# 1. mexa no código em src/
npm run smoke        # confere que nada quebrou
npm run sync         # leva o build para o projeto iOS
```

No Xcode, incremente **Build** (e **Version**, se for mudança visível ao usuário),
depois Archive e Upload de novo. Correções que não mexem na ficha da loja costumam
passar pela revisão mais rápido.

---

## Os pontos onde essa submissão pode travar

**A chave de API.** É o risco real. Um app cujo recurso de destaque exige credencial de
terceiro é aberto pelo revisor, testado sem credencial e reprovado por incompleto.
A defesa está pronta em `notas-para-revisao.md`, mas ela depende de você colar uma
chave válida lá.

**O manifesto de privacidade fora do target.** Falha na validação do upload, não na
revisão — você descobre no Xcode, com uma mensagem pouco clara. Passo 3.

**Ícone com transparência.** O ícone gerado em `AppIcon-512@2x.png` é RGB sem canal
alfa, que é o exigido. Se você trocar por um seu, garanta o mesmo: PNG com
transparência é rejeitado na validação.

**Assinatura.** Bundle ID diferente entre Xcode, `capacitor.config.ts` e App Store
Connect é o erro mais comum de primeira submissão.

---

## Sobre uma versão Android

O mesmo código roda: `npm install @capacitor/android && npx cap add android`. Muda o
processo de assinatura e a loja (Google Play Console, US$ 25 uma vez). O `Info.plist`
vira `AndroidManifest.xml` e as permissões de câmera precisam ser declaradas lá.
