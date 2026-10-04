import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Locacao } from '@/types/app'
import { diasAte, formatarData, formatarMoeda, num } from '@/utils/format'

/** Com esta antecedência (dias) a devolução entra nos alertas. */
export const AVISO_DEVOLUCAO = 3

/** Devolvida há até tantos dias sem pagamento lançado continua nos alertas. */
const COBRAR_PAGAMENTO_DIAS = 30

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

/**
 * Valor sugerido para pagar a locadora pelos dias que o equipamento ficou na obra
 * (períodos de 24h, como as locadoras cobram: retirou dia 1 e devolveu dia 3 = 2 diárias; mínimo 1).
 * Períodos começados contam inteiros: 9 dias numa cobrança semanal = 2 semanas. Null se não houver valor informado.
 */
export function valorSugerido(
  l: Pick<Locacao, 'Data_Retirada' | 'Data_Devolucao' | 'Data_Devolucao_Prevista' | 'Valor' | 'Cobranca'>,
): { valor: number; conta: string } | null {
  const valor = num(l.Valor)
  if (!valor) return null
  if (!l.Cobranca || l.Cobranca === 'Valor fechado') return { valor, conta: 'valor fechado' }
  const fim = l.Data_Devolucao ?? l.Data_Devolucao_Prevista
  const dias = Math.max(1, differenceInCalendarDays(parseISO(fim), parseISO(l.Data_Retirada)))
  const periodo = DIAS_POR_PERIODO[l.Cobranca] ?? 1
  const quantos = Math.ceil(dias / periodo)
  const nome: Record<string, [string, string]> = {
    Diária: ['diária', 'diárias'],
    Semanal: ['semana', 'semanas'],
    Quinzenal: ['quinzena', 'quinzenas'],
    Mensal: ['mês', 'meses'],
  }
  const [um, varios] = nome[l.Cobranca] ?? ['período', 'períodos']
  return {
    valor: quantos * valor,
    conta: `${quantos} ${quantos === 1 ? um : varios} × ${formatarMoeda(valor)} (${dias} ${dias === 1 ? 'dia' : 'dias'} de uso)`,
  }
}

export type AlertaLocacao = {
  id: string
  nivel: 'critico' | 'aviso'
  titulo: string
  texto: string
}

/**
 * Locações ativas que vencem em até AVISO_DEVOLUCAO dias ou já venceram (da mais urgente à menos),
 * seguidas das devolvidas recentemente sem o pagamento à locadora lançado.
 */
export function alertasDeLocacoes(
  locacoes: readonly (Locacao & { Nome_Obra: string | null })[],
): AlertaLocacao[] {
  const prazos = locacoes
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
      } satisfies AlertaLocacao
    })

  const semPagamento = locacoes
    .filter((l) => {
      if (!l.Data_Devolucao || l.ID_Saida) return false
      const ha = -(diasAte(l.Data_Devolucao) ?? 0)
      return ha >= 0 && ha <= COBRAR_PAGAMENTO_DIAS
    })
    .map(
      (l): AlertaLocacao => ({
        id: `${l.ID_Locacao}-pagamento`,
        nivel: 'aviso',
        titulo: `${l.Equipamento}: devolvido, pagamento não lançado`,
        texto: `Devolvido em ${formatarData(l.Data_Devolucao)} (${l.Nome_Obra ?? 'Geral da empresa'}${l.Locadora ? ` · ${l.Locadora}` : ''}). Lance o pagamento à locadora para o custo entrar na obra.`,
      }),
    )

  return [...prazos, ...semPagamento]
}
