import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Troque para o Bundle ID que você registrar no Apple Developer.
  // Precisa ser idêntico ao do App Store Connect e ao do Xcode.
  appId: 'com.kauagiusti.apice',
  appName: 'Ápice',
  webDir: 'dist',

  ios: {
    // Faz a WebView servir o app a partir de https://localhost em vez de
    // capacitor://localhost. Isso importa: a API da Anthropic responde a
    // requisições de navegador com CORS, e uma origem `capacitor://` é
    // exótica o bastante para ser rejeitada. Com `https` a origem é comum.
    scheme: 'https',
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#08090cff',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: '#08090c',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK', // conteúdo claro sobre fundo escuro
      backgroundColor: '#08090c',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
    },
  },
}

export default config
