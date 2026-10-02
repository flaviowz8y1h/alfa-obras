import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { type Alteracao, type Trabalhador, paraInsert } from '@/types/app'
import { exigirLinhas } from '@/utils/erros'

export const CHAVE_TRABALHADORES = 'dTrabalhadores'

export function useTrabalhadores() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: [CHAVE_TRABALHADORES, idEmpresa],
    queryFn: async (): Promise<Trabalhador[]> => {
      const { data, error } = await supabase
        .from('dTrabalhadores')
        .select('*')
        .eq('ID_Empresa', idEmpresa)
        .order('Nome_Trabalhador')
      if (error) throw error
      return data
    },
  })
}

export type DadosTrabalhador = Required<
  Pick<
    Alteracao<'dTrabalhadores'>,
    'Nome_Trabalhador' | 'Funcao' | 'Tipo_Vinc_Contrato' | 'Valor_Diaria_Padrao' | 'Chave_PIX' | 'Status'
  >
>

export function useSalvarTrabalhador() {
  const { idEmpresa } = useUsuarioLogado()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosTrabalhador }) => {
      const consulta = id
        ? supabase.from('dTrabalhadores').update(dados).eq('ID_Trabalhador', id)
        : supabase
            .from('dTrabalhadores')
            .insert(paraInsert<'dTrabalhadores'>({ ...dados, ID_Empresa: idEmpresa }))
      const { data, error } = await consulta.select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [CHAVE_TRABALHADORES] }),
  })
}

export function useExcluirTrabalhador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('dTrabalhadores')
        .delete()
        .eq('ID_Trabalhador', id)
        .select('ID_Trabalhador')
      if (error) throw error
      exigirLinhas(data)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [CHAVE_TRABALHADORES] }),
  })
}

/**
 * Pagamentos de mão de obra que tocam a semana: período cruzando [inicio, fim]
 * ou, sem período, pagos dentro dela. A chave começa pela tabela para os
 * formulários de pagamento invalidarem esta consulta também.
 */
export function usePagamentosSemana(inicio: string, fim: string) {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['fPagamentosMaoDeObra', idEmpresa, 'semana', inicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fPagamentosMaoDeObra')
        .select(
          'ID_Pagamento, ID_Trabalhador, Data_Pagamento, Periodo_Inicio, Periodo_Fim, Quantidade_Dias, Dias_Trabalhados, Tipo_Pagamento, Valor_Pago, Valor_Diaria_Aplicado, dObras(Nome_Obra)',
        )
        .eq('ID_Empresa', idEmpresa)
        .or(
          `and(Periodo_Inicio.lte.${fim},Periodo_Fim.gte.${inicio}),and(Data_Pagamento.gte.${inicio},Data_Pagamento.lte.${fim})`,
        )
      if (error) throw error
      return data.map(({ dObras, ...p }) => ({ ...p, Nome_Obra: dObras?.Nome_Obra ?? null }))
    },
    placeholderData: (anterior) => anterior,
  })
}

export type PagamentoSemana = NonNullable<ReturnType<typeof usePagamentosSemana>['data']>[number]
