import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { type Alteracao, paraInsert } from '@/types/app'
import { exigirLinhas } from '@/utils/erros'

export const CHAVE_CLIENTES = 'dClientes'

export function useClientes() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: [CHAVE_CLIENTES, idEmpresa],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dClientes')
        .select('*, dObras(count)')
        .eq('ID_Empresa', idEmpresa)
        .order('Nome_Cliente')
      if (error) throw error
      return data.map(({ dObras, ...c }) => ({ ...c, totalObras: dObras[0]?.count ?? 0 }))
    },
  })
}

export type ClienteLista = NonNullable<ReturnType<typeof useClientes>['data']>[number]
export type DadosCliente = Required<Pick<Alteracao<'dClientes'>, 'Nome_Cliente' | 'Telefone_Cliente' | 'Status'>>

export function useSalvarCliente() {
  const { idEmpresa } = useUsuarioLogado()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosCliente }) => {
      const consulta = id
        ? supabase.from('dClientes').update(dados).eq('ID_Cliente', id)
        : supabase.from('dClientes').insert(paraInsert<'dClientes'>({ ...dados, ID_Empresa: idEmpresa }))
      const { data, error } = await consulta.select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CHAVE_CLIENTES] })
      // o nome do cliente aparece em obras e no resumo
      void qc.invalidateQueries({ queryKey: ['dObras'] })
      void qc.invalidateQueries({ queryKey: ['vw_resumo_obras'] })
    },
  })
}

export function useExcluirCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('dClientes').delete().eq('ID_Cliente', id).select('ID_Cliente')
      if (error) throw error
      exigirLinhas(data)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [CHAVE_CLIENTES] }),
  })
}
