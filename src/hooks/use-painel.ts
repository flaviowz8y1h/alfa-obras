import { useState } from 'react'

export type EstadoPainel<T> = { modo: 'fechado' } | { modo: 'novo' } | { modo: 'editar'; registro: T }

/** Estado comum das telas de cadastro: painel de formulário + confirmação de exclusão. */
export function usePainel<T>() {
  const [painel, setPainel] = useState<EstadoPainel<T>>({ modo: 'fechado' })
  const [excluindo, setExcluindo] = useState<T | null>(null)

  return {
    painel,
    novo: () => setPainel({ modo: 'novo' }),
    editar: (registro: T) => setPainel({ modo: 'editar', registro }),
    fechar: () => setPainel({ modo: 'fechado' }),
    excluindo,
    pedirExclusao: (registro: T) => setExcluindo(registro),
    cancelarExclusao: () => setExcluindo(null),
  }
}
