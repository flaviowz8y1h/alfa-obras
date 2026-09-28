import { useQuery } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { num } from '@/utils/format'

/*
 * Consultas da página de detalhe da obra. As chaves começam pelo nome da tabela
 * para que as invalidações dos formulários (['fSaidasObras'], ['vw_resumo_obras']…)
 * também atualizem esta página.
 */

export function useObra(id: string) {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['dObras', idEmpresa, 'detalhe', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dObras')
        .select('*, dClientes(Nome_Cliente, Telefone_Cliente)')
        .eq('ID_Obra', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const { dClientes, ...obra } = data
      return {
        ...obra,
        Nome_Cliente: dClientes?.Nome_Cliente ?? null,
        Telefone_Cliente: dClientes?.Telefone_Cliente ?? null,
      }
    },
  })
}

export type ObraDetalhe = NonNullable<NonNullable<ReturnType<typeof useObra>['data']>>

export function useResumoObra(id: string) {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['vw_resumo_obras', idEmpresa, 'obra', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_resumo_obras').select('*').eq('ID_Obra', id).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export type PontoFluxo = { mes: string; entradas: number; saidas: number; saldo: number }

export function useFluxoObra(id: string) {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['vw_fluxo_mensal', idEmpresa, 'obra', id],
    queryFn: async (): Promise<PontoFluxo[]> => {
      const { data, error } = await supabase
        .from('vw_fluxo_mensal')
        .select('mes, entradas, saidas, saldo')
        .eq('ID_Obra', id)
        .order('mes')
      if (error) throw error
      return data
        .filter((d): d is typeof d & { mes: string } => !!d.mes)
        .map((d) => ({ mes: d.mes.slice(0, 7), entradas: num(d.entradas), saidas: num(d.saidas), saldo: num(d.saldo) }))
    },
  })
}

export type TipoMovimento = 'recebimento' | 'saida' | 'mao_de_obra'

export type Movimento = {
  id: string
  tipo: TipoMovimento
  data: string | null
  titulo: string
  detalhe: string
  valor: number
  /** Para o gráfico de "onde foi o dinheiro". */
  categoria: string
}

/** Todos os lançamentos da obra, em uma lista só (mais recentes primeiro). */
export function useExtratoObra(id: string) {
  const { idEmpresa } = useUsuarioLogado()
  const chave = (tabela: string) => [tabela, idEmpresa, 'obra', id]

  const recebimentos = useQuery({
    queryKey: chave('fRecebimentosObras'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fRecebimentosObras')
        .select('ID_Recebimento, Data_Recebimento, Valor_Recebido, Forma_Pagamento, Observacao')
        .eq('ID_Obra', id)
      if (error) throw error
      return data.map(
        (r): Movimento => ({
          id: r.ID_Recebimento,
          tipo: 'recebimento',
          data: r.Data_Recebimento,
          titulo: r.Observacao || 'Recebimento do cliente',
          detalhe: r.Forma_Pagamento ?? '',
          valor: num(r.Valor_Recebido),
          categoria: 'Recebimento',
        }),
      )
    },
  })

  const saidas = useQuery({
    queryKey: chave('fSaidasObras'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fSaidasObras')
        .select('ID_Saida, Data_Saida, Valor, Forma_Pagamento, Fornecedor_Local, Descricao, dCategoriaGastos(Nome_Categoria)')
        .eq('ID_Obra', id)
      if (error) throw error
      return data.map((s): Movimento => {
        const categoria = s.dCategoriaGastos?.Nome_Categoria ?? 'Sem categoria'
        return {
          id: s.ID_Saida,
          tipo: 'saida',
          data: s.Data_Saida,
          titulo: s.Descricao || categoria,
          detalhe: [s.Descricao ? categoria : null, s.Fornecedor_Local, s.Forma_Pagamento].filter(Boolean).join(' · '),
          valor: num(s.Valor),
          categoria,
        }
      })
    },
  })

  const maoDeObra = useQuery({
    queryKey: chave('fPagamentosMaoDeObra'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fPagamentosMaoDeObra')
        .select('ID_Pagamento, Data_Pagamento, Valor_Pago, Tipo_Pagamento, Quantidade_Dias, dTrabalhadores(Nome_Trabalhador, Funcao)')
        .eq('ID_Obra', id)
      if (error) throw error
      return data.map(
        (m): Movimento => ({
          id: m.ID_Pagamento,
          tipo: 'mao_de_obra',
          data: m.Data_Pagamento,
          titulo: m.dTrabalhadores?.Nome_Trabalhador ?? 'Mão de obra',
          detalhe: [m.dTrabalhadores?.Funcao, m.Tipo_Pagamento].filter(Boolean).join(' · '),
          valor: num(m.Valor_Pago),
          categoria: 'Mão de obra',
        }),
      )
    },
  })

  const consultas = [recebimentos, saidas, maoDeObra]
  const movimentos = consultas
    .flatMap((c) => c.data ?? [])
    .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))

  return {
    movimentos,
    carregando: consultas.some((c) => c.isPending),
    erro: consultas.find((c) => c.isError)?.error ?? null,
    recarregar: () => consultas.forEach((c) => void c.refetch()),
  }
}
