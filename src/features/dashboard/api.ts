import { useQuery } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import type { TipoLancamento } from '@/features/lancamentos/tipos'
import type { PontoFluxo } from '@/features/obras/api-detalhe'
import { supabase } from '@/lib/supabase'
import { num } from '@/utils/format'

/* As chaves começam pelo nome da tabela/view para as invalidações dos formulários valerem aqui. */

/** Fluxo mensal somando todas as obras da empresa. */
export function useFluxoEmpresa() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['vw_fluxo_mensal', idEmpresa, 'empresa'],
    queryFn: async (): Promise<PontoFluxo[]> => {
      const { data, error } = await supabase
        .from('vw_fluxo_mensal')
        .select('mes, entradas, saidas')
        .eq('ID_Empresa', idEmpresa)
      if (error) throw error
      const porMes = new Map<string, PontoFluxo>()
      for (const d of data) {
        if (!d.mes) continue
        const mes = d.mes.slice(0, 7)
        const p = porMes.get(mes) ?? { mes, entradas: 0, saidas: 0, saldo: 0 }
        p.entradas += num(d.entradas)
        p.saidas += num(d.saidas)
        p.saldo = p.entradas - p.saidas
        porMes.set(mes, p)
      }
      return [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes))
    },
  })
}

/**
 * Saídas que não pesam em nenhuma obra: sem obra ("Geral da empresa") ou de categoria
 * que não entra no custo (ex.: compra de equipamento). Saem do caixa da empresa.
 */
export function useSaidasForaDasObras() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['vw_fluxo_mensal', idEmpresa, 'fora-das-obras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_fluxo_mensal')
        .select('saidas')
        .eq('ID_Empresa', idEmpresa)
        .is('ID_Obra', null)
      if (error) throw error
      return data.reduce((t, d) => t + num(d.saidas), 0)
    },
  })
}

export type UltimoLancamento = {
  id: string
  tipo: TipoLancamento
  titulo: string
  obra: string | null
  data: string | null
  criadoEm: string
  /** Positivo = entrada; negativo = saída. */
  valor: number
}

const QUANTOS = 6

/** Os lançamentos registrados por último, das três tabelas. */
export function useUltimosLancamentos() {
  const { idEmpresa } = useUsuarioLogado()
  const chave = (tabela: string) => [tabela, idEmpresa, 'ultimos']

  const recebimentos = useQuery({
    queryKey: chave('fRecebimentosObras'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fRecebimentosObras')
        .select('ID_Recebimento, Data_Recebimento, Valor_Recebido, Observacao, Criado_Em, dObras(Nome_Obra)')
        .eq('ID_Empresa', idEmpresa)
        .order('Criado_Em', { ascending: false })
        .limit(QUANTOS)
      if (error) throw error
      return data.map(
        (r): UltimoLancamento => ({
          id: r.ID_Recebimento,
          tipo: 'recebimento',
          titulo: r.Observacao || 'Recebimento do cliente',
          obra: r.dObras?.Nome_Obra ?? null,
          data: r.Data_Recebimento,
          criadoEm: r.Criado_Em,
          valor: num(r.Valor_Recebido),
        }),
      )
    },
  })

  const saidas = useQuery({
    queryKey: chave('fSaidasObras'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fSaidasObras')
        .select('ID_Saida, Data_Saida, Valor, Descricao, Criado_Em, dObras(Nome_Obra), dCategoriaGastos(Nome_Categoria)')
        .eq('ID_Empresa', idEmpresa)
        .order('Criado_Em', { ascending: false })
        .limit(QUANTOS)
      if (error) throw error
      return data.map(
        (s): UltimoLancamento => ({
          id: s.ID_Saida,
          tipo: 'saida',
          titulo: s.Descricao || s.dCategoriaGastos?.Nome_Categoria || 'Saída',
          obra: s.dObras?.Nome_Obra ?? 'Geral da empresa',
          data: s.Data_Saida,
          criadoEm: s.Criado_Em,
          valor: -num(s.Valor),
        }),
      )
    },
  })

  const maoDeObra = useQuery({
    queryKey: chave('fPagamentosMaoDeObra'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fPagamentosMaoDeObra')
        .select('ID_Pagamento, Data_Pagamento, Valor_Pago, Tipo_Pagamento, Criado_Em, dObras(Nome_Obra), dTrabalhadores(Nome_Trabalhador)')
        .eq('ID_Empresa', idEmpresa)
        .order('Criado_Em', { ascending: false })
        .limit(QUANTOS)
      if (error) throw error
      return data.map(
        (m): UltimoLancamento => ({
          id: m.ID_Pagamento,
          tipo: 'mao_de_obra',
          titulo: [m.dTrabalhadores?.Nome_Trabalhador ?? 'Mão de obra', m.Tipo_Pagamento].filter(Boolean).join(' — '),
          obra: m.dObras?.Nome_Obra ?? null,
          data: m.Data_Pagamento,
          criadoEm: m.Criado_Em,
          valor: -num(m.Valor_Pago),
        }),
      )
    },
  })

  const consultas = [recebimentos, saidas, maoDeObra]
  return {
    itens: consultas
      .flatMap((c) => c.data ?? [])
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, QUANTOS),
    carregando: consultas.some((c) => c.isPending),
    erro: consultas.find((c) => c.isError)?.error ?? null,
    recarregar: () => consultas.forEach((c) => void c.refetch()),
  }
}
