import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Forklift,
  ChartNoAxesCombined,
  HardHat,
  LayoutDashboard,
  type LucideIcon,
  ReceiptText,
  ShieldCheck,
  Tags,
  Users,
  Wallet,
} from 'lucide-react'
import type { Perfil } from '@/types/app'
import { PERFIS_ANALISES } from '@/features/auth/permissoes'

export type ItemNav = {
  rotulo: string
  para: string
  icone: LucideIcon
  /** Se definido, só esses perfis veem o item. */
  perfis?: readonly Perfil[]
  filhos?: readonly ItemNav[]
}

export const LANCAMENTOS: readonly ItemNav[] = [
  { rotulo: 'Saídas', para: '/lancamentos/saidas', icone: ArrowUpFromLine },
  { rotulo: 'Recebimentos', para: '/lancamentos/recebimentos', icone: ArrowDownToLine },
  { rotulo: 'Mão de obra', para: '/lancamentos/mao-de-obra', icone: Wallet },
]

export const NAVEGACAO: readonly ItemNav[] = [
  { rotulo: 'Pauta da semana', para: '/', icone: LayoutDashboard },
  { rotulo: 'Obras', para: '/obras', icone: Building2 },
  { rotulo: 'Clientes', para: '/clientes', icone: Users },
  { rotulo: 'Equipe', para: '/trabalhadores', icone: HardHat },
  { rotulo: 'Locações', para: '/locacoes', icone: Forklift },
  { rotulo: 'Lançamentos', para: '/lancamentos', icone: ReceiptText, filhos: LANCAMENTOS },
  { rotulo: 'Categorias', para: '/categorias', icone: Tags },
  { rotulo: 'Análises', para: '/analises', icone: ChartNoAxesCombined, perfis: PERFIS_ANALISES },
  { rotulo: 'Usuários', para: '/usuarios', icone: ShieldCheck, perfis: ['owner'] },
]

/** Itens fixos do menu inferior no celular (o resto vai para "Mais"). */
export const NAV_INFERIOR = ['/', '/obras', '/lancamentos', '/trabalhadores'] as const

export function visivelPara(item: ItemNav, perfil: Perfil): boolean {
  return !item.perfis || item.perfis.includes(perfil)
}
