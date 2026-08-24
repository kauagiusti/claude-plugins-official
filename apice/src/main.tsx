import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FolhaFiguras from './FolhaFiguras'
import './index.css'
import { configurarNativo, migrarParaNativo } from './lib/nativo'

// Quem já usava a versão web no mesmo aparelho não perde o histórico ao
// instalar o app: os dados do localStorage sobem para o armazenamento nativo
// antes de o React montar.
migrarParaNativo('apice-v1')
  .catch(() => {
    // Falha na migração não pode impedir o app de abrir — no pior caso o
    // usuário começa do zero, o que é o comportamento de uma instalação nova.
  })
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        {/* Folha de contato dos desenhos, só em desenvolvimento: boneco de
            traço se confere olhando os 36 lado a lado, não lendo coordenada.
            `npm run dev` e abra /?figuras=1. */}
        {import.meta.env.DEV && new URLSearchParams(location.search).has('figuras') ? (
          <FolhaFiguras />
        ) : (
          <App />
        )}
      </React.StrictMode>,
    )
    void configurarNativo()
  })
