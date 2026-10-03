import { useQuery } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { num } from '@/utils/format'
import type { ResumoObra } from '@/types/app'
import { lerPaginas, periodoValido, type FiltrosAnalise, type MovimentoAnalise } from './calculos'

export function usePosicaoAnalise() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['vw_resumo_obras', idEmpresa, 'analises-atual'],
    enabled: !!idEmpresa,
    queryFn: ({ signal }): Promise<ResumoObra[]> =>
      lerPaginas((inicio, fim) =>
        supabase
          .from('vw_resumo_obras')
          .select('*')
          .eq('ID_Empresa', idEmpresa)
          .order('ID_Obra')
          .range(inicio, fim)
          .abortSignal(signal),
      ),
  })
}

export function useMovimentosAnalise(filtros: FiltrosAnalise) {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['analises', idEmpresa, filtros.inicio, filtros.fim, filtros.obra],
    enabled: !!idEmpresa && periodoValido(filtros),
    queryFn: async ({ signal }): Promise<MovimentoAnalise[]> => {
      const [recebimentos, saidas, pagamentos] = await Promise.all([
        lerPaginas((inicio, fim) => {
          let q = supabase
            .from('fRecebimentosObras')
            .select(
              'ID_Recebimento, ID_Obra, Data_Recebimento, Valor_Recebido, Observacao, dObras(Nome_Obra)',
            )
            .eq('ID_Empresa', idEmpresa)
            .gte('Data_Recebimento', filtros.inicio)
            .lte('Data_Recebimento', filtros.fim)
          if (filtros.obra)
            q = filtros.obra === 'geral' ? q.is('ID_Obra', null) : q.eq('ID_Obra', filtros.obra)
          return q.order('ID_Recebimento').range(inicio, fim).abortSignal(signal)
        }),
        lerPaginas((inicio, fim) => {
          let q = supabase
            .from('fSaidasObras')
            .select(
              'ID_Saida, ID_Obra, ID_Categoria, Data_Saida, Valor, Descricao, dObras(Nome_Obra), dCategoriaGastos(Nome_Categoria)',
            )
            .eq('ID_Empresa', idEmpresa)
            .gte('Data_Saida', filtros.inicio)
            .lte('Data_Saida', filtros.fim)
          if (filtros.obra)
            q = filtros.obra === 'geral' ? q.is('ID_Obra', null) : q.eq('ID_Obra', filtros.obra)
          return q.order('ID_Saida').range(inicio, fim).abortSignal(signal)
        }),
        lerPaginas((inicio, fim) => {
          let q = supabase
            .from('fPagamentosMaoDeObra')
            .select(
              'ID_Pagamento, ID_Obra, ID_Trabalhador, Data_Pagamento, Valor_Pago, Tipo_Pagamento, dObras(Nome_Obra), dTrabalhadores(Nome_Trabalhador)',
            )
            .eq('ID_Empresa', idEmpresa)
            .gte('Data_Pagamento', filtros.inicio)
            .lte('Data_Pagamento', filtros.fim)
          if (filtros.obra)
            q = filtros.obra === 'geral' ? q.is('ID_Obra', null) : q.eq('ID_Obra', filtros.obra)
          return q.order('ID_Pagamento').range(inicio, fim).abortSignal(signal)
        }),
      ])
      return [
        ...recebimentos.map((r): MovimentoAnalise => ({
          id: r.ID_Recebimento,
          tipo: 'recebimento',
          data: r.Data_Recebimento ?? '',
          valor: num(r.Valor_Recebido),
          obraId: r.ID_Obra,
          obra: r.dObras?.Nome_Obra ?? 'Geral da empresa',
          grupoId: 'recebimento',
          grupo: 'Recebimento',
          descricao: r.Observacao || 'Pagamento do cliente',
        })),
        ...saidas.map((s): MovimentoAnalise => ({
          id: s.ID_Saida,
          tipo: 'saida',
          data: s.Data_Saida ?? '',
          valor: num(s.Valor),
          obraId: s.ID_Obra,
          obra: s.dObras?.Nome_Obra ?? 'Geral da empresa',
          grupoId: s.ID_Categoria ?? 'sem-categoria',
          grupo: s.dCategoriaGastos?.Nome_Categoria ?? 'Sem categoria',
          descricao: s.Descricao || s.dCategoriaGastos?.Nome_Categoria || 'Saída',
        })),
        ...pagamentos.map((p): MovimentoAnalise => ({
          id: p.ID_Pagamento,
          tipo: 'mao_de_obra',
          data: p.Data_Pagamento ?? '',
          valor: num(p.Valor_Pago),
          obraId: p.ID_Obra,
          obra: p.dObras?.Nome_Obra ?? 'Geral da empresa',
          grupoId: p.ID_Trabalhador,
          grupo: p.dTrabalhadores?.Nome_Trabalhador ?? 'Trabalhador sem nome',
          descricao: p.Tipo_Pagamento || 'Pagamento à equipe',
        })),
      ].sort((a, b) => b.data.localeCompare(a.data) || a.id.localeCompare(b.id))
    },
  })
}
