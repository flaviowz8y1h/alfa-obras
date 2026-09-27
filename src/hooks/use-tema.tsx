import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Tema = 'claro' | 'escuro'
type TemaContexto = { escuro: boolean; alternar: () => void }

const CHAVE = 'alfa-tema'
const Contexto = createContext<TemaContexto | null>(null)

function temaInicial(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch {
    /* storage indisponível: segue o sistema */
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', tema === 'escuro' ? '#070F26' : '#0A1A3F')
  }, [tema])

  const alternar = useCallback(() => {
    setTema((atual) => {
      const proximo = atual === 'escuro' ? 'claro' : 'escuro'
      try {
        localStorage.setItem(CHAVE, proximo)
      } catch {
        /* sem persistência */
      }
      return proximo
    })
  }, [])

  const valor = useMemo(() => ({ escuro: tema === 'escuro', alternar }), [tema, alternar])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTema() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useTema precisa estar dentro de <TemaProvider>')
  return ctx
}
