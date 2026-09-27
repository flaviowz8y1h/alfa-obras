import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { type Alteracao, paraInsert } from '@/types/app'
import { exigirLinhas } from '@/utils/erros'

export const CHAVE_CATEGORIAS = 'dCategoriaGastos'

export function useCategorias() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: [CHAVE_CATEGORIAS, idEmpresa],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dCategoriaGastos')
        .select('*, fSaidasObras(count)')
        .eq('ID_Empresa', idEmpresa)
        .order('Nome_Categoria')
      if (error) throw error
      return data.map(({ fSaidasObras, ...c }) => ({ ...c, totalSaidas: fSaidasObras[0]?.count ?? 0 }))
    },
  })
}

export type CategoriaLista = NonNullable<ReturnType<typeof useCategorias>['data']>[number]
export type DadosCategoria = Required<
  Pick<Alteracao<'dCategoriaGastos'>, 'Nome_Categoria' | 'Grupo_DRE' | 'Tipo_Custo' | 'Impacta_Obra' | 'Status'>
>

export function useSalvarCategoria() {
  const { idEmpresa } = useUsuarioLogado()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosCategoria }) => {
      const consulta = id
        ? supabase.from('dCategoriaGastos').update(dados).eq('ID_Categoria', id)
        : supabase
            .from('dCategoriaGastos')
            .insert(paraInsert<'dCategoriaGastos'>({ ...dados, ID_Empresa: idEmpresa }))
      const { data, error } = await consulta.select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [CHAVE_CATEGORIAS] }),
  })
}

export function useExcluirCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('dCategoriaGastos')
        .delete()
        .eq('ID_Categoria', id)
        .select('ID_Categoria')
      if (error) throw error
      exigirLinhas(data)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [CHAVE_CATEGORIAS] }),
  })
}
