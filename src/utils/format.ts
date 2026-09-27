import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const moedaCompacta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const porcento = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })

export function formatarMoeda(valor: number | null | undefined): string {
  return moeda.format(valor ?? 0)
}

export function formatarMoedaCompacta(valor: number | null | undefined): string {
  return moedaCompacta.format(valor ?? 0)
}

export function formatarPorcento(fracao: number): string {
  return porcento.format(Number.isFinite(fracao) ? fracao : 0)
}

/** Datas do banco chegam como 'yyyy-MM-dd'; parseISO evita o deslocamento de fuso do `new Date()`. */
export function formatarData(data: string | null | undefined, padrao = 'dd/MM/yyyy'): string {
  if (!data) return '—'
  return format(parseISO(data), padrao, { locale: ptBR })
}

export function hojePorExtenso(): string {
  return format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
}
