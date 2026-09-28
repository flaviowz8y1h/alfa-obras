import { useQuery } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import type { ResumoObra } from '@/types/app'
import { num } from '@/utils/format'

export type Totais = {
  obras: number
  emAndamento: number
  contratado: number
  recebido: number
  aReceber: number
  materiais: number
  maoDeObra: number
  custo: number
  saldo: number
  margemPrevista: number
}

export function somarTotais(linhas: readonly ResumoObra[]): Totais {
  const t: Totais = {
    obras: linhas.length,
    emAndamento: 0,
    contratado: 0,
    recebido: 0,
    aReceber: 0,
    materiais: 0,
    maoDeObra: 0,
    custo: 0,
    saldo: 0,
    margemPrevista: 0,
  }
  for (const o of linhas) {
    if (o.Status === 'Em Andamento') t.emAndamento++
    t.contratado += num(o.valor_contratado)
    t.recebido += num(o.total_recebido)
    t.aReceber += num(o.a_receber)
    t.materiais += num(o.total_saidas)
    t.maoDeObra += num(o.total_mao_de_obra)
    t.custo += num(o.custo_total)
    t.saldo += num(o.saldo_caixa)
    t.margemPrevista += num(o.margem_prevista)
  }
  return t
}

export function useResumoObras() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['vw_resumo_obras', idEmpresa],
    queryFn: async () => {
      // RLS já filtra por empresa; o eq deixa explícito e usa o índice.
      const { data, error } = await supabase
        .from('vw_resumo_obras')
        .select('*')
        .eq('ID_Empresa', idEmpresa)
        .order('Nome_Obra')
      if (error) throw error
      return data
    },
    select: (linhas) => ({ linhas, totais: somarTotais(linhas) }),
  })
}
