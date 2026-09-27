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
