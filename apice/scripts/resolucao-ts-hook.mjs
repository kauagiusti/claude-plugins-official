/**
 * Gancho de resolução: completa a extensão que o estilo de bundler omite.
 * Tenta `.ts`, depois `.tsx`, depois `index.ts` — a mesma ordem do Vite.
 */
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const TENTATIVAS = ['.ts', '.tsx', '/index.ts', '/index.tsx']

export async function resolve(especificador, contexto, proximo) {
  if (especificador.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(especificador)) {
    for (const sufixo of TENTATIVAS) {
      const candidato = new URL(especificador + sufixo, contexto.parentURL)
      if (existsSync(fileURLToPath(candidato))) {
        return proximo(especificador + sufixo, contexto)
      }
    }
  }
  return proximo(especificador, contexto)
}
