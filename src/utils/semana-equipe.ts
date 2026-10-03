import { eachDayOfInterval, getDay, parseISO } from 'date-fns'
import type { Trabalhador } from '../types/app.ts'
import type { PagamentoSemana } from '../features/trabalhadores/api.ts'
import { resumoDiariaNaSemana } from './diarias.ts'
import { num } from './format.ts'

/** Dias de segunda a sábado de um período (domingo não conta, como no lançamento). */
function diasUteis(inicio: string, fim: string): number {
  const a = parseISO(inicio)
  const b = parseISO(fim)
  if (b < a) return 0
  return eachDayOfInterval({ start: a, end: b }).filter((d) => getDay(d) !== 0).length
}

export type LinhaSemana = {
  trabalhador: Trabalhador
  dias: Set<string>
  valor: number
  obras: Set<string>
  semDatas: boolean
}

export function montarSemana(
  dias: readonly string[],
  pagamentos: readonly PagamentoSemana[],
  trabalhadores: readonly Trabalhador[],
): LinhaSemana[] {
  const porId = new Map(trabalhadores.map((t) => [t.ID_Trabalhador, t]))
  const linhas = new Map<string, LinhaSemana>()
  const linha = (t: Trabalhador) => {
    const l = linhas.get(t.ID_Trabalhador) ?? {
      trabalhador: t,
      dias: new Set(),
      valor: 0,
      obras: new Set(),
      semDatas: false,
    }
    linhas.set(t.ID_Trabalhador, l)
    return l
  }

  for (const p of pagamentos) {
    const t = porId.get(p.ID_Trabalhador)
    if (!t) continue
    const l = linha(t)
    if (p.Nome_Obra) l.obras.add(p.Nome_Obra)
    if (p.Tipo_Pagamento === 'Diária') {
      const resumo = resumoDiariaNaSemana(p, dias)
      resumo.datas.forEach((d) => l.dias.add(d))
      l.valor += resumo.valor
      l.semDatas ||= resumo.semDatas
      continue
    }
    if (!p.Periodo_Inicio || !p.Periodo_Fim) {
      // sem período: conta o valor na semana em que foi pago
      l.valor += num(p.Valor_Pago)
      continue
    }
    const { Periodo_Inicio: ini, Periodo_Fim: fim } = p
    const cobertos = dias.filter((d) => d >= ini && d <= fim)
    cobertos.forEach((d) => l.dias.add(d))
    // período maior que a semana: só a parte proporcional entra aqui
    const total = diasUteis(ini, fim)
    const proporcional = total ? (num(p.Valor_Pago) * cobertos.length) / total : 0
    l.valor += proporcional
  }

  // diaristas ativos sem nada pago também aparecem: é justamente quem pode estar faltando
  for (const t of trabalhadores) {
    if ((t.Status ?? 'Ativo') === 'Ativo' && t.Tipo_Vinc_Contrato === 'Diarista') linha(t)
  }

  return [...linhas.values()].sort((a, b) =>
    (a.trabalhador.Nome_Trabalhador ?? '').localeCompare(
      b.trabalhador.Nome_Trabalhador ?? '',
      'pt-BR',
    ),
  )
}
