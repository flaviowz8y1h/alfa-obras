import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { type Alteracao, paraInsert } from '@/types/app'
import { exigirLinhas } from '@/utils/erros'

export const CHAVE_LOCACOES = 'fLocacoes'

/** Todas as locações da empresa, das ativas que vencem primeiro às devolvidas. */
export function useLocacoes() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: [CHAVE_LOCACOES, idEmpresa],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fLocacoes')
        .select('*, dObras(Nome_Obra)')
        .eq('ID_Empresa', idEmpresa)
        .order('Data_Devolucao_Prevista')
      if (error) throw error
      return data.map(({ dObras, ...l }) => ({ ...l, Nome_Obra: dObras?.Nome_Obra ?? null }))
    },
  })
}

export type LocacaoLista = NonNullable<ReturnType<typeof useLocacoes>['data']>[number]
export type DadosLocacao = Required<
  Pick<
    Alteracao<'fLocacoes'>,
    | 'Equipamento'
    | 'Quantidade'
    | 'ID_Obra'
    | 'Locadora'
    | 'Telefone_Locadora'
    | 'Data_Retirada'
    | 'Data_Devolucao_Prevista'
    | 'Valor'
    | 'Cobranca'
    | 'Observacao'
  >
>

function useInvalidar() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: [CHAVE_LOCACOES] })
}

export function useSalvarLocacao() {
  const { idEmpresa } = useUsuarioLogado()
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosLocacao }) => {
      const consulta = id
        ? supabase.from('fLocacoes').update(dados).eq('ID_Locacao', id)
        : supabase.from('fLocacoes').insert(paraInsert<'fLocacoes'>({ ...dados, ID_Empresa: idEmpresa }))
      const { data, error } = await consulta.select().single()
      if (error) throw error
      return data
    },
    onSuccess: invalidar,
  })
}

/** "Devolvi": encerra a locação na data informada (vazia = desfaz a devolução). */
export function useDevolverLocacao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: string | null }) => {
      const { data: linhas, error } = await supabase
        .from('fLocacoes')
        .update({ Data_Devolucao: data })
        .eq('ID_Locacao', id)
        .select('ID_Locacao')
      if (error) throw error
      exigirLinhas(linhas)
    },
    onSuccess: invalidar,
  })
}

/** Renovou com a locadora: só muda a devolução prevista. */
export function useProrrogarLocacao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, prevista }: { id: string; prevista: string }) => {
      const { data, error } = await supabase
        .from('fLocacoes')
        .update({ Data_Devolucao_Prevista: prevista })
        .eq('ID_Locacao', id)
        .select('ID_Locacao')
      if (error) throw error
      exigirLinhas(data)
    },
    onSuccess: invalidar,
  })
}

/** Liga a locação à saída que pagou a locadora (chamado pelo formulário de saída). */
export async function vincularPagamentoLocacao(idLocacao: string, idSaida: string) {
  const { data, error } = await supabase
    .from('fLocacoes')
    .update({ ID_Saida: idSaida })
    .eq('ID_Locacao', idLocacao)
    .select('ID_Locacao')
  if (error) throw error
  exigirLinhas(data)
}

export function useExcluirLocacao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('fLocacoes').delete().eq('ID_Locacao', id).select('ID_Locacao')
      if (error) throw error
      exigirLinhas(data)
    },
    onSuccess: invalidar,
  })
}
