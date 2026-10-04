import { CalendarClock, CircleCheck, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locacao } from '@/types/app'
import { situacaoLocacao, textoPrazo } from './regras'

/** Selo do prazo: verde devolvida, laranja vencendo, vermelho hoje/atrasada. */
export function SeloPrazo({
  locacao,
  className,
}: {
  locacao: Pick<Locacao, 'Data_Devolucao' | 'Data_Devolucao_Prevista'>
  className?: string
}) {
  const { situacao } = situacaoLocacao(locacao)
  const Icone = situacao === 'devolvida' ? CircleCheck : situacao === 'ativa' ? CalendarClock : TriangleAlert
  return (
    <span
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold whitespace-nowrap',
        situacao === 'devolvida' && 'bg-muted text-muted-foreground',
        situacao === 'ativa' && 'bg-secondary text-secondary-foreground',
        situacao === 'logo' && 'bg-aviso-fundo text-aviso',
        (situacao === 'hoje' || situacao === 'atrasada') && 'bg-negativo-fundo text-negativo',
        className,
      )}
    >
      <Icone className="size-3.5" aria-hidden="true" />
      {textoPrazo(locacao)}
    </span>
  )
}
