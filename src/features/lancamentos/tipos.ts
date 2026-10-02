import { ArrowDownToLine, ArrowUpFromLine, type LucideIcon, Wallet } from 'lucide-react'

export type TipoLancamento = 'recebimento' | 'saida' | 'mao_de_obra'

export const TIPO_LANCAMENTO: Record<
  TipoLancamento,
  { rotulo: string; plural: string; icone: LucideIcon; caixa: string; para: string }
> = {
  recebimento: {
    rotulo: 'Recebimento',
    plural: 'Recebimentos',
    icone: ArrowDownToLine,
    caixa: 'bg-serie-entrada/12 text-serie-entrada',
    para: '/lancamentos/recebimentos',
  },
  saida: {
    rotulo: 'Saída',
    plural: 'Saídas',
    icone: ArrowUpFromLine,
    caixa: 'bg-serie-saida/12 text-serie-saida',
    para: '/lancamentos/saidas',
  },
  mao_de_obra: {
    rotulo: 'Mão de obra',
    plural: 'Mão de obra',
    icone: Wallet,
    caixa: 'bg-accent text-accent-foreground',
    para: '/lancamentos/mao-de-obra',
  },
}
