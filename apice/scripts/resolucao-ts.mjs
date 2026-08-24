/**
 * Faz o Node resolver os imports do jeito que o Vite resolve.
 *
 * O código de `src/` importa sem extensão (`./forca`, `../data/exercicios`),
 * que é o padrão de bundler. O Node exige a extensão. Sem este gancho, testar
 * um módulo no Node exigiria mudar o estilo de import do app inteiro só por
 * causa do teste — o rabo abanando o cachorro.
 */
import { register } from 'node:module'

register('./resolucao-ts-hook.mjs', import.meta.url)
