/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Marcado apenas na build de página única (`npm run site`), que roda dentro
   * de um sandbox onde chamadas para fora do domínio são bloqueadas. Serve para
   * o app avisar isso em vez de deixar o usuário achar que a chave dele é
   * inválida.
   */
  readonly VITE_PREVIEW_SANDBOX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
