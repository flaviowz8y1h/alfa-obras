import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { type Alteracao, paraInsert } from '@/types/app'
import { exigirLinhas } from '@/utils/erros'

export const CHAVE_OBRAS = 'dObras'

export function useObras() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: [CHAVE_OBRAS, idEmpresa],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dObras')
        .select('*, dClientes(Nome_Cliente)')
        .eq('ID_Empresa', idEmpresa)
        .order('Data_Inicio', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data.map(({ dClientes, ...o }) => ({ ...o, Nome_Cliente: dClientes?.Nome_Cliente ?? null }))
    },
  })
}

export type ObraLista = NonNullable<ReturnType<typeof useObras>['data']>[number]
export type DadosObra = Required<
  Pick<
    Alteracao<'dObras'>,
    'Nome_Obra' | 'ID_Cliente' | 'Valor_Contratado' | 'Data_Inicio' | 'Previsao_Termino' | 'Status'
  >
>

function invalidar(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: [CHAVE_OBRAS] })
  void qc.invalidateQueries({ queryKey: ['dClientes'] }) // contagem de obras por cliente
  void qc.invalidateQueries({ queryKey: ['vw_resumo_obras'] })
}

export function useSalvarObra() {
  const { idEmpresa } = useUsuarioLogado()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosObra }) => {
      const consulta = id
        ? supabase.from('dObras').update(dados).eq('ID_Obra', id)
        : supabase.from('dObras').insert(paraInsert<'dObras'>({ ...dados, ID_Empresa: idEmpresa }))
      const { data, error } = await consulta.select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidar(qc),
  })
}

export function useExcluirObra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('dObras').delete().eq('ID_Obra', id).select('ID_Obra')
      if (error) throw error
      exigirLinhas(data)
    },
    onSuccess: () => invalidar(qc),
  })
}
