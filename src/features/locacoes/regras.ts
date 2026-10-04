import type { Locacao } from '@/types/app'
import { diasAte, formatarData, formatarMoeda, num } from '@/utils/format'

/** Com esta antecedência (dias) a devolução entra nos alertas. */
export const AVISO_DEVOLUCAO = 3

export type Situacao = 'devolvida' | 'atrasada' | 'hoje' | 'logo' | 'ativa'

/** Dias por período de cobrança, para estimar quanto o atraso custa por dia. */
const DIAS_POR_PERIODO: Record<string, number> = { Diária: 1, Semanal: 7, Quinzenal: 15, Mensal: 30 }

export function situacaoLocacao(l: Pick<Locacao, 'Data_Devolucao' | 'Data_Devolucao_Prevista'>): {
  situacao: Situacao
  /** Dias até a devolução prevista (negativo = atrasada). Null se já devolvida. */
  dias: number | null
} {
  if (l.Data_Devolucao) return { situacao: 'devolvida', dias: null }
  const dias = diasAte(l.Data_Devolucao_Prevista) ?? 0
  if (dias < 0) return { situacao: 'atrasada', dias }
  if (dias === 0) return { situacao: 'hoje', dias }
  if (dias <= AVISO_DEVOLUCAO) return { situacao: 'logo', dias }
  return { situacao: 'ativa', dias }
}

/** Texto curto do prazo: "Devolver em 5 dias", "Devolve hoje", "Atrasada 2 dias". */
export function textoPrazo(l: Pick<Locacao, 'Data_Devolucao' | 'Data_Devolucao_Prevista'>): string {
  const { situacao, dias } = situacaoLocacao(l)
  if (situacao === 'devolvida') return `Devolvida em ${formatarData(l.Data_Devolucao)}`
  if (situacao === 'hoje') return 'Devolve hoje'
  if (situacao === 'atrasada') return `Atrasada ${-dias!} ${dias === -1 ? 'dia' : 'dias'}`
  return `Devolver em ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

/**
 * Quanto o atraso já custa a mais, pela cobrança informada (estimativa).
 * Null quando não dá para calcular: sem valor, valor fechado ou sem atraso.
 */
export function custoDoAtraso(l: Pick<Locacao, 'Data_Devolucao' | 'Data_Devolucao_Prevista' | 'Valor' | 'Cobranca'>): number | null {
  const { situacao, dias } = situacaoLocacao(l)
  const periodo = DIAS_POR_PERIODO[l.Cobranca ?? '']
  if (situacao !== 'atrasada' || !periodo || !num(l.Valor)) return null
  return (num(l.Valor) / periodo) * -dias!
}

export type AlertaLocacao = {
  id: string
  nivel: 'critico' | 'aviso'
  titulo: string
  texto: string
}

/** Locações ativas que vencem em até AVISO_DEVOLUCAO dias ou já venceram, da mais urgente à menos. */
export function alertasDeLocacoes(
  locacoes: readonly (Locacao & { Nome_Obra: string | null })[],
): AlertaLocacao[] {
  return locacoes
    .map((l) => ({ l, ...situacaoLocacao(l) }))
    .filter((x) => x.situacao === 'atrasada' || x.situacao === 'hoje' || x.situacao === 'logo')
    .sort((a, b) => a.dias! - b.dias!)
    .map(({ l, situacao }) => {
      const onde = l.Nome_Obra ?? 'Geral da empresa'
      const locadora = l.Locadora ? ` · ${l.Locadora}` : ''
      const extra = custoDoAtraso(l)
      return {
        id: l.ID_Locacao,
        nivel: situacao === 'logo' ? 'aviso' : 'critico',
        titulo: `${l.Equipamento}: ${textoPrazo(l).toLowerCase()}`,
        texto:
          situacao === 'atrasada'
            ? `Era para devolver em ${formatarData(l.Data_Devolucao_Prevista)} (${onde}${locadora}).` +
              (extra ? ` Cerca de ${formatarMoeda(extra)} a mais em aluguel.` : '') +
              ' Devolva ou prorrogue com a locadora.'
            : `Devolução em ${formatarData(l.Data_Devolucao_Prevista)} (${onde}${locadora}).`,
      }
    })
}
