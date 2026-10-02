import { eachDayOfInterval, isValid, parseISO } from 'date-fns'
import { ehDomingo, num, paraISO } from './format.ts'

type PeriodoPagamento = {
  Periodo_Inicio: string | null
  Periodo_Fim: string | null
  Quantidade_Dias: number | null
  Dias_Trabalhados: string[] | null
}

export function diasPadrao(inicio: string, fim: string): string[] {
  const a = parseISO(inicio)
  const b = parseISO(fim)
  if (!isValid(a) || !isValid(b) || b < a) return []
  return eachDayOfInterval({ start: a, end: b })
    .map(paraISO)
    .filter((d) => !ehDomingo(d))
}

/** Registros antigos só permitem recuperar as datas quando todo o período foi pago. */
export function datasPagamento(p: PeriodoPagamento): string[] | null {
  if (p.Dias_Trabalhados != null) return [...new Set(p.Dias_Trabalhados)].sort()
  if (!p.Periodo_Inicio || !p.Periodo_Fim) return null
  const padrao = diasPadrao(p.Periodo_Inicio, p.Periodo_Fim)
  return padrao.length > 0 && num(p.Quantidade_Dias) === padrao.length ? padrao : null
}

/** Quantidade digitada manualmente não permite inventar quais datas foram trabalhadas. */
export function datasParaSalvar(
  marcados: ReadonlySet<string>,
  quantidade: number | null,
  inicio: string,
  fim: string,
): string[] | null {
  const datas = [...marcados].filter((d) => d >= inicio && d <= fim).sort()
  return quantidade === datas.length ? datas : null
}

export function resumoDiariaNaSemana(
  p: PeriodoPagamento & { Valor_Pago: number | null; Data_Pagamento: string | null },
  semana: readonly string[],
) {
  const datas = datasPagamento(p)
  if (datas != null) {
    const cobertos = datas.filter((d) => semana.includes(d))
    return {
      datas: cobertos,
      valor: datas.length ? (num(p.Valor_Pago) * cobertos.length) / datas.length : 0,
      semDatas: false,
    }
  }
  // Sem datas exatas, o valor fica na semana do pagamento, sem marcar dias como pagos.
  const pagoNaSemana = p.Data_Pagamento != null && semana.includes(p.Data_Pagamento)
  return { datas: [], valor: pagoNaSemana ? num(p.Valor_Pago) : 0, semDatas: true }
}
