import { useQuery } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import type { ResumoObra } from '@/types/app'

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
    t.contratado += o.valor_contratado ?? 0
    t.recebido += o.total_recebido ?? 0
    t.aReceber += o.a_receber ?? 0
    t.materiais += o.total_saidas ?? 0
    t.maoDeObra += o.total_mao_de_obra ?? 0
    t.custo += o.custo_total ?? 0
    t.saldo += o.saldo_caixa ?? 0
    t.margemPrevista += o.margem_prevista ?? 0
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
