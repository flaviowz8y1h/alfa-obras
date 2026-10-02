import { cn } from '@/lib/utils'
import { TIPO_LANCAMENTO, type TipoLancamento } from './tipos'

/** Ícone do tipo num quadrado colorido; forma e cor mudam juntas, a cor não é a única pista. */
export function IconeTipo({ tipo, className }: { tipo: TipoLancamento; className?: string }) {
  const t = TIPO_LANCAMENTO[tipo]
  const Icone = t.icone
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', t.caixa, className)}>
      <Icone className="size-[1.125rem]" aria-hidden="true" />
      <span className="sr-only">{t.rotulo}</span>
    </span>
  )
}
