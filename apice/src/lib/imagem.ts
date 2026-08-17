export interface ImagemPreparada {
  dataUrl: string
  base64: string
  mediaType: 'image/jpeg'
}

/**
 * Reduz a foto antes de enviar. Fotos de celular chegam a 4000 px e custam
 * milhares de tokens sem melhorar o reconhecimento de comida — 1024 px no lado
 * maior preserva o detalhe que importa (textura, volume, talheres de
 * referência) a uma fração do custo.
 */
export function prepararImagem(arquivo: File, ladoMaximo = 1024, qualidade = 0.82): Promise<ImagemPreparada> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Não consegui ler o arquivo de imagem.'))
    leitor.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Arquivo não é uma imagem válida.'))
      img.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height))
        const largura = Math.max(1, Math.round(img.width * escala))
        const altura = Math.max(1, Math.round(img.height * escala))

        const canvas = document.createElement('canvas')
        canvas.width = largura
        canvas.height = altura
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Navegador não suporta canvas.'))
        ctx.drawImage(img, 0, 0, largura, altura)

        const dataUrl = canvas.toDataURL('image/jpeg', qualidade)
        resolve({
          dataUrl,
          base64: dataUrl.split(',')[1] ?? '',
          mediaType: 'image/jpeg',
        })
      }
      img.src = String(leitor.result)
    }
    leitor.readAsDataURL(arquivo)
  })
}

/** Miniatura para guardar no histórico sem estourar o localStorage. */
export function miniatura(dataUrl: string, lado = 320, qualidade = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onerror = () => resolve(dataUrl)
    img.onload = () => {
      const escala = Math.min(1, lado / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * escala))
      canvas.height = Math.max(1, Math.round(img.height * escala))
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', qualidade))
    }
    img.src = dataUrl
  })
}
