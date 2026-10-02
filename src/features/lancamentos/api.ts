import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { apagarComprovante } from '@/lib/comprovantes'
import { supabase } from '@/lib/supabase'
import { type Alteracao, paraInsert } from '@/types/app'
import { exigirLinhas } from '@/utils/erros'
import { type Mes, intervaloDoMes } from '@/utils/format'

type Filtros = { mes: Mes; obra: string }

/** Qualquer lançamento muda os totais das obras, do dashboard e do fluxo mensal. */
function invalidarTotais(qc: QueryClient, tabela: string) {
  void qc.invalidateQueries({ queryKey: [tabela] })
  void qc.invalidateQueries({ queryKey: ['vw_resumo_obras'] })
  void qc.invalidateQueries({ queryKey: ['vw_fluxo_mensal'] })
}

/* ================= Saídas ================= */

export function useSaidas({ mes, obra }: Filtros) {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['fSaidasObras', idEmpresa, mes, obra],
    queryFn: async () => {
      const { inicio, fim } = intervaloDoMes(mes)
      let q = supabase
        .from('fSaidasObras')
        .select('*, dObras(Nome_Obra), dCategoriaGastos(Nome_Categoria)')
        .eq('ID_Empresa', idEmpresa)
        .gte('Data_Saida', inicio)
        .lte('Data_Saida', fim)
      if (obra) q = q.eq('ID_Obra', obra)
      const { data, error } = await q
        .order('Data_Saida', { ascending: false })
        .order('Criado_Em', { ascending: false })
      if (error) throw error
      return data.map(({ dObras, dCategoriaGastos, ...s }) => ({
        ...s,
        Nome_Obra: dObras?.Nome_Obra ?? null,
        Nome_Categoria: dCategoriaGastos?.Nome_Categoria ?? null,
      }))
    },
    placeholderData: (anterior) => anterior,
  })
}

export type SaidaLista = NonNullable<ReturnType<typeof useSaidas>['data']>[number]
export type DadosSaida = Required<
  Pick<
    Alteracao<'fSaidasObras'>,
    | 'ID_Obra'
    | 'ID_Categoria'
    | 'Data_Saida'
    | 'Valor'
    | 'Forma_Pagamento'
    | 'Fornecedor_Local'
    | 'Descricao'
    | 'Numero_Nota_Fiscal'
    | 'Comprovante_URL'
  >
>

/** Fornecedores já usados, para sugerir no campo (mais recentes primeiro). */
export function useFornecedores() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['fSaidasObras', idEmpresa, 'fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fSaidasObras')
        .select('Fornecedor_Local')
        .eq('ID_Empresa', idEmpresa)
        .not('Fornecedor_Local', 'is', null)
        .order('Data_Saida', { ascending: false })
        .limit(300)
      if (error) throw error
      return [...new Set(data.map((d) => d.Fornecedor_Local?.trim()).filter((f): f is string => !!f))]
    },
    staleTime: 5 * 60_000,
  })
}

export function useSalvarSaida() {
  const { idEmpresa } = useUsuarioLogado()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosSaida }) => {
      const consulta = id
        ? supabase.from('fSaidasObras').update(dados).eq('ID_Saida', id)
        : supabase.from('fSaidasObras').insert(paraInsert<'fSaidasObras'>({ ...dados, ID_Empresa: idEmpresa }))
      const { data, error } = await consulta.select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidarTotais(qc, 'fSaidasObras')
      void qc.invalidateQueries({ queryKey: ['dCategoriaGastos'] }) // contagem por categoria
    },
  })
}

export function useExcluirSaida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comprovante }: { id: string; comprovante: string | null }) => {
      const { data, error } = await supabase.from('fSaidasObras').delete().eq('ID_Saida', id).select('ID_Saida')
      if (error) throw error
      exigirLinhas(data)
      await apagarComprovante(comprovante)
    },
    onSuccess: () => {
      invalidarTotais(qc, 'fSaidasObras')
      void qc.invalidateQueries({ queryKey: ['dCategoriaGastos'] })
    },
  })
}

/* ================= Recebimentos ================= */

export function useRecebimentos({ mes, obra }: Filtros) {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['fRecebimentosObras', idEmpresa, mes, obra],
    queryFn: async () => {
      const { inicio, fim } = intervaloDoMes(mes)
      let q = supabase
        .from('fRecebimentosObras')
        .select('*, dObras(Nome_Obra, dClientes(Nome_Cliente))')
        .eq('ID_Empresa', idEmpresa)
        .gte('Data_Recebimento', inicio)
        .lte('Data_Recebimento', fim)
      if (obra) q = q.eq('ID_Obra', obra)
      const { data, error } = await q
        .order('Data_Recebimento', { ascending: false })
        .order('Criado_Em', { ascending: false })
      if (error) throw error
      return data.map(({ dObras, ...r }) => ({
        ...r,
        Nome_Obra: dObras?.Nome_Obra ?? null,
        Nome_Cliente: dObras?.dClientes?.Nome_Cliente ?? null,
      }))
    },
    placeholderData: (anterior) => anterior,
  })
}

export type RecebimentoLista = NonNullable<ReturnType<typeof useRecebimentos>['data']>[number]
export type DadosRecebimento = Required<
  Pick<
    Alteracao<'fRecebimentosObras'>,
    'ID_Obra' | 'Data_Recebimento' | 'Valor_Recebido' | 'Forma_Pagamento' | 'Observacao'
  >
>

export function useSalvarRecebimento() {
  const { idEmpresa } = useUsuarioLogado()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosRecebimento }) => {
      const consulta = id
        ? supabase.from('fRecebimentosObras').update(dados).eq('ID_Recebimento', id)
        : supabase
            .from('fRecebimentosObras')
            .insert(paraInsert<'fRecebimentosObras'>({ ...dados, ID_Empresa: idEmpresa }))
      const { data, error } = await consulta.select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidarTotais(qc, 'fRecebimentosObras'),
  })
}

export function useExcluirRecebimento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('fRecebimentosObras')
        .delete()
        .eq('ID_Recebimento', id)
        .select('ID_Recebimento')
      if (error) throw error
      exigirLinhas(data)
    },
    onSuccess: () => invalidarTotais(qc, 'fRecebimentosObras'),
  })
}

/* ================= Mão de obra ================= */

export function usePagamentosMaoDeObra({ mes, obra }: Filtros) {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['fPagamentosMaoDeObra', idEmpresa, mes, obra],
    queryFn: async () => {
      const { inicio, fim } = intervaloDoMes(mes)
      let q = supabase
        .from('fPagamentosMaoDeObra')
        .select('*, dObras(Nome_Obra), dTrabalhadores(Nome_Trabalhador, Funcao)')
        .eq('ID_Empresa', idEmpresa)
        .gte('Data_Pagamento', inicio)
        .lte('Data_Pagamento', fim)
      if (obra) q = q.eq('ID_Obra', obra)
      const { data, error } = await q
        .order('Data_Pagamento', { ascending: false })
        .order('Criado_Em', { ascending: false })
      if (error) throw error
      return data.map(({ dObras, dTrabalhadores, ...p }) => ({
        ...p,
        Nome_Obra: dObras?.Nome_Obra ?? null,
        Nome_Trabalhador: dTrabalhadores?.Nome_Trabalhador ?? null,
        Funcao: dTrabalhadores?.Funcao ?? null,
      }))
    },
    placeholderData: (anterior) => anterior,
  })
}

export type PagamentoLista = NonNullable<ReturnType<typeof usePagamentosMaoDeObra>['data']>[number]
export type DadosPagamento = Required<
  Pick<
    Alteracao<'fPagamentosMaoDeObra'>,
    | 'ID_Obra'
    | 'ID_Trabalhador'
    | 'Data_Pagamento'
    | 'Tipo_Pagamento'
    | 'Valor_Pago'
    | 'Forma_Pagamento'
    | 'Observacao'
    | 'Periodo_Inicio'
    | 'Periodo_Fim'
    | 'Quantidade_Dias'
    | 'Dias_Trabalhados'
    | 'Valor_Diaria_Aplicado'
  >
>

export function useSalvarPagamento() {
  const { idEmpresa } = useUsuarioLogado()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosPagamento }) => {
      const consulta = id
        ? supabase.from('fPagamentosMaoDeObra').update(dados).eq('ID_Pagamento', id)
        : supabase
            .from('fPagamentosMaoDeObra')
            .insert(paraInsert<'fPagamentosMaoDeObra'>({ ...dados, ID_Empresa: idEmpresa }))
      const { data, error } = await consulta.select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidarTotais(qc, 'fPagamentosMaoDeObra'),
  })
}

export function useExcluirPagamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('fPagamentosMaoDeObra')
        .delete()
        .eq('ID_Pagamento', id)
        .select('ID_Pagamento')
      if (error) throw error
      exigirLinhas(data)
    },
    onSuccess: () => invalidarTotais(qc, 'fPagamentosMaoDeObra'),
  })
}
