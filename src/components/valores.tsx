import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatarMoeda, formatarPorcento, num } from '@/utils/format'

/** Valor em BRL com números tabulares. */
export function Moeda({ valor, className }: { valor: number | null | undefined; className?: string }) {
  return <span className={cn('numero whitespace-nowrap', className)}>{formatarMoeda(valor)}</span>
}

/** Saldo com sinal + ícone: a cor nunca é a única pista. */
export function Saldo({
  valor,
  className,
  comIcone = true,
}: {
  valor: number | null | undefined
  className?: string
  comIcone?: boolean
}) {
  const v = num(valor)
  const Icone = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus
  const rotulo = v > 0 ? 'positivo' : v < 0 ? 'negativo' : 'zerado'
  return (
    <span
      className={cn(
        'numero inline-flex items-center gap-1.5 whitespace-nowrap',
        v > 0 && 'text-positivo',
        v < 0 && 'text-negativo',
        className,
      )}
    >
      {comIcone && <Icone className="size-[0.9em] shrink-0" aria-hidden="true" />}
      {v > 0 ? '+' : ''}
      {formatarMoeda(v)}
      <span className="sr-only"> ({rotulo})</span>
    </span>
  )
}

/** Barra "trena": parte / total, com marcações a cada 10%. */
export function Trena({
  parte,
  total,
  rotulo,
  cor,
  className,
}: {
  parte: number
  total: number
  rotulo: string
  cor?: string
  className?: string
}) {
  const fracao = total > 0 ? parte / total : 0
  const largura = Math.min(Math.max(fracao, 0), 1)
  return (
    <div
      role="meter"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fracao * 100)}
      aria-valuetext={formatarPorcento(fracao)}
      className={cn('trena', className)}
      style={cor ? ({ '--trena-cor': cor } as React.CSSProperties) : undefined}
    >
      <span style={{ width: `${largura * 100}%` }} />
    </div>
  )
}
