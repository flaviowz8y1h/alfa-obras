import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useObras } from '@/features/obras/api'
import { type Mes, mesAtual } from '@/utils/format'

/* ---------------- Obras disponíveis para lançar ---------------- */

const ENCERRADAS = ['Concluída', 'Cancelada']

/** Obras em aberto (+ a obra atual do registro, mesmo encerrada) no formato do select. */
export function useOpcoesObra(idAtual?: string | null) {
  const obras = useObras()
  const opcoes = useMemo(
    () =>
      (obras.data ?? [])
        .filter((o) => !ENCERRADAS.includes(o.Status ?? '') || o.ID_Obra === idAtual)
        .map((o) => ({
          valor: o.ID_Obra,
          rotulo: o.Nome_Cliente ? `${o.Nome_Obra} — ${o.Nome_Cliente}` : (o.Nome_Obra ?? o.ID_Obra),
        })),
    [obras.data, idAtual],
  )
  return { opcoes, carregando: obras.isPending }
}

/* ---------------- Lembrar a última obra usada ---------------- */

const CHAVE_ULTIMA_OBRA = 'alfa-ultima-obra'

export function lerUltimaObra(): string {
  try {
    return localStorage.getItem(CHAVE_ULTIMA_OBRA) ?? ''
  } catch {
    return ''
  }
}

export function salvarUltimaObra(id: string) {
  try {
    localStorage.setItem(CHAVE_ULTIMA_OBRA, id)
  } catch {
    /* sem storage: só não lembra */
  }
}

/* ---------------- ?novo=1 abre o formulário direto ---------------- */

/** Atalho da tela "Lançar": /lancamentos/saidas?novo=1 já abre o formulário. */
export function useNovoPelaUrl(abrir: () => void) {
  const [params, setParams] = useSearchParams()
  const pedirNovo = params.get('novo') === '1'
  useEffect(() => {
    if (!pedirNovo) return
    abrir()
    setParams(
      (p) => {
        p.delete('novo')
        return p
      },
      { replace: true },
    )
  }, [pedirNovo, abrir, setParams])
}

/* ---------------- Filtros: mês + obra ---------------- */

export function useFiltrosLancamento() {
  const [mes, setMes] = useState<Mes>(mesAtual)
  const [obra, setObra] = useState('')
  return { mes, setMes, obra, setObra }
}

export function ehContinuar(evento?: React.BaseSyntheticEvent): boolean {
  const submitter = (evento?.nativeEvent as SubmitEvent | undefined)?.submitter
  return submitter?.getAttribute('name') === 'continuar'
}
