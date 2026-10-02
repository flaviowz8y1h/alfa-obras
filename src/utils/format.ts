import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const moedaCompacta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const porcento = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** O PostgREST pode devolver numeric como string; normaliza para número. */
export function num(valor: number | string | null | undefined): number {
  const n = typeof valor === 'string' ? Number(valor) : (valor ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function formatarMoeda(valor: number | string | null | undefined): string {
  return moeda.format(num(valor))
}

export function formatarMoedaCompacta(valor: number | string | null | undefined): string {
  return moedaCompacta.format(num(valor))
}

export function formatarPorcento(fracao: number): string {
  return porcento.format(Number.isFinite(fracao) ? fracao : 0)
}

export function formatarNumero(valor: number | string | null | undefined): string {
  return decimal.format(num(valor))
}

/** Datas do banco chegam como 'yyyy-MM-dd'; parseISO evita o deslocamento de fuso do `new Date()`. */
export function formatarData(data: string | null | undefined, padrao = 'dd/MM/yyyy'): string {
  if (!data) return '—'
  const d = parseISO(data)
  return isValid(d) ? format(d, padrao, { locale: ptBR }) : '—'
}

export function hojePorExtenso(): string {
  return format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
}

/** Hoje no fuso local, 'yyyy-MM-dd' (toISOString usaria UTC e viraria o dia à noite). */
export function hojeISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Dias corridos de hoje até a data (negativo se já passou). Null se não houver data. */
export function diasAte(data: string | null | undefined): number | null {
  if (!data) return null
  const d = parseISO(data)
  return isValid(d) ? differenceInCalendarDays(d, new Date()) : null
}

export function paraISO(data: Date): string {
  return format(data, 'yyyy-MM-dd')
}

/* ---------- Meses (filtro dos lançamentos) ---------- */

/** Mês no formato 'yyyy-MM'. */
export type Mes = string

export function mesAtual(): Mes {
  return format(new Date(), 'yyyy-MM')
}

export function deslocarMes(mes: Mes, delta: number): Mes {
  return format(addMonths(parseISO(`${mes}-01`), delta), 'yyyy-MM')
}

export function intervaloDoMes(mes: Mes): { inicio: string; fim: string } {
  const d = parseISO(`${mes}-01`)
  return { inicio: paraISO(startOfMonth(d)), fim: paraISO(endOfMonth(d)) }
}

export function nomeDoMes(mes: Mes): string {
  return format(parseISO(`${mes}-01`), "MMMM 'de' yyyy", { locale: ptBR })
}

/* ---------- Mão de obra ---------- */

/** Limite para mostrar os dias um a um (acima disso, só a contagem). */
export const MAX_DIAS_PERIODO = 31

/** Todas as datas do período, inclusive ('yyyy-MM-dd'). Vazio se inválido ou longo demais. */
export function diasDoPeriodo(inicio: string, fim: string): string[] {
  const a = parseISO(inicio)
  const b = parseISO(fim)
  if (!isValid(a) || !isValid(b) || b < a) return []
  const dias = eachDayOfInterval({ start: a, end: b })
  return dias.length > MAX_DIAS_PERIODO ? [] : dias.map(paraISO)
}

/** Por padrão conta de segunda a sábado — domingo fica de fora. */
export function ehDomingo(dia: string): boolean {
  return getDay(parseISO(dia)) === 0
}

export function diasTrabalhados(inicio: string, fim: string): number {
  return diasDoPeriodo(inicio, fim).filter((d) => !ehDomingo(d)).length
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

export function rotuloDia(dia: string): { semana: string; numero: string } {
  const d = parseISO(dia)
  return { semana: DIAS_SEMANA[getDay(d)] ?? '', numero: format(d, 'dd') }
}

/** Segunda e sexta da semana atual — período padrão de uma diária semanal. */
export function semanaAtual(): { inicio: string; fim: string } {
  const seg = startOfWeek(new Date(), { weekStartsOn: 1 })
  const sex = new Date(seg)
  sex.setDate(seg.getDate() + 4)
  return { inicio: paraISO(seg), fim: paraISO(sex) }
}
