import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Preferences } from '@capacitor/preferences'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import type { StateStorage } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Ponte com o aparelho.
//
// O mesmo código roda no navegador e dentro do app nativo. Tudo aqui degrada
// para o equivalente web quando não há plataforma nativa, então nenhuma tela
// precisa saber onde está rodando.
// ---------------------------------------------------------------------------

export const ehNativo = (): boolean => Capacitor.isNativePlatform()
export const ehIOS = (): boolean => Capacitor.getPlatform() === 'ios'

// ------------------------------ Armazenamento ------------------------------

/**
 * No iOS o `localStorage` da WKWebView é cache: o sistema pode descartá-lo
 * quando o aparelho fica sem espaço. Para meses de histórico de treino isso é
 * perda de dado real, então no nativo o estado vai para Preferences, que grava
 * em UserDefaults e sobrevive.
 */
export const armazenamento: StateStorage = {
  getItem: async (chave) => {
    if (!ehNativo()) return localStorage.getItem(chave)
    const { value } = await Preferences.get({ key: chave })
    return value ?? null
  },
  setItem: async (chave, valor) => {
    if (!ehNativo()) {
      localStorage.setItem(chave, valor)
      return
    }
    await Preferences.set({ key: chave, value: valor })
  },
  removeItem: async (chave) => {
    if (!ehNativo()) {
      localStorage.removeItem(chave)
      return
    }
    await Preferences.remove({ key: chave })
  },
}

/**
 * Migra uma base já existente no localStorage para o armazenamento nativo.
 * Roda uma vez, na primeira abertura do app instalado por quem já usava a
 * versão web no mesmo aparelho.
 */
export async function migrarParaNativo(chave: string): Promise<void> {
  if (!ehNativo()) return
  const { value } = await Preferences.get({ key: chave })
  if (value) return
  const antigo = localStorage.getItem(chave)
  if (antigo) await Preferences.set({ key: chave, value: antigo })
}

// --------------------------------- Câmera ----------------------------------

export interface FotoCapturada {
  dataUrl: string
  base64: string
  mediaType: 'image/jpeg'
}

/**
 * Abre a câmera nativa. `ladoMaximo` e `qualidade` são aplicados pelo próprio
 * iOS antes de a imagem chegar ao JavaScript — mais rápido e com muito menos
 * memória que redimensionar num canvas depois.
 */
export async function tirarFoto(ladoMaximo = 1024, qualidade = 82): Promise<FotoCapturada> {
  const foto = await Camera.getPhoto({
    quality: qualidade,
    width: ladoMaximo,
    height: ladoMaximo,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    correctOrientation: true,
    promptLabelHeader: 'Foto da refeição',
    promptLabelCancel: 'Cancelar',
  })
  const base64 = foto.base64String ?? ''
  return { base64, dataUrl: `data:image/jpeg;base64,${base64}`, mediaType: 'image/jpeg' }
}

export async function escolherDaGaleria(ladoMaximo = 1024, qualidade = 82): Promise<FotoCapturada[]> {
  const { photos } = await Camera.pickImages({ quality: qualidade, width: ladoMaximo, height: ladoMaximo, limit: 3 })
  const resultados: FotoCapturada[] = []
  for (const p of photos) {
    // pickImages devolve caminho de arquivo; converte para base64 pela WebView.
    const resposta = await fetch(p.webPath)
    const blob = await resposta.blob()
    const dataUrl = await new Promise<string>((ok) => {
      const fr = new FileReader()
      fr.onload = () => ok(String(fr.result))
      fr.readAsDataURL(blob)
    })
    resultados.push({ dataUrl, base64: dataUrl.split(',')[1] ?? '', mediaType: 'image/jpeg' })
  }
  return resultados
}

// -------------------------------- Háptico ----------------------------------

export async function vibrar(tipo: 'leve' | 'medio' | 'sucesso' | 'erro' = 'leve'): Promise<void> {
  if (!ehNativo()) return
  try {
    if (tipo === 'sucesso') await Haptics.notification({ type: NotificationType.Success })
    else if (tipo === 'erro') await Haptics.notification({ type: NotificationType.Error })
    else await Haptics.impact({ style: tipo === 'medio' ? ImpactStyle.Medium : ImpactStyle.Light })
  } catch {
    // Háptico é enfeite: aparelho sem motor ou permissão negada não é erro.
  }
}

// --------------------------- HTTP sem CORS ---------------------------------

/**
 * `fetch` que sai pela camada nativa em vez da WebView.
 *
 * Requisição feita pela WebView passa por CORS; pela camada nativa, não —
 * é uma chamada HTTP comum do app. Isso remove a dependência de a origem
 * `https://localhost` ser aceita pela API, que é a parte que só dá para
 * confirmar rodando no aparelho.
 *
 * Limite: CapacitorHttp entrega a resposta inteira de uma vez, sem streaming.
 * Serve para a análise de foto (uma resposta só); o coach continua no fetch da
 * WebView para manter o texto aparecendo aos poucos.
 */
export const fetchNativo: typeof fetch = async (entrada, init) => {
  const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url
  const metodo = (init?.method ?? 'GET').toUpperCase()

  const cabecalhos: Record<string, string> = {}
  new Headers(init?.headers).forEach((valor, chave) => {
    cabecalhos[chave] = valor
  })

  let corpo: unknown
  if (typeof init?.body === 'string') {
    try {
      corpo = JSON.parse(init.body)
    } catch {
      corpo = init.body
    }
  }

  const resposta = await CapacitorHttp.request({
    url,
    method: metodo,
    headers: cabecalhos,
    data: corpo,
    responseType: 'json',
    readTimeout: 180000,
    connectTimeout: 30000,
  })

  const texto = typeof resposta.data === 'string' ? resposta.data : JSON.stringify(resposta.data ?? null)

  return new Response(texto, {
    status: resposta.status,
    statusText: String(resposta.status),
    headers: new Headers(
      Object.fromEntries(
        Object.entries(resposta.headers ?? {}).map(([k, v]) => [k, String(v)]),
      ),
    ),
  })
}

// ------------------------------- Inicialização -----------------------------

/** Ajustes de aparência que só fazem sentido no app instalado. */
export async function configurarNativo(): Promise<void> {
  if (!ehNativo()) return
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await SplashScreen.hide()
  } catch {
    // Plugin ausente numa build parcial não deve derrubar o app.
  }
}
