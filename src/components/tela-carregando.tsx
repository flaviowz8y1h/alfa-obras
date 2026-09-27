import { Loader2 } from 'lucide-react'
import { Monograma } from '@/components/marca'

export function TelaCarregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background text-foreground"
      role="status"
      aria-live="polite"
    >
      <Monograma className="size-14 text-marca dark:text-white" />
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {texto}
      </p>
    </div>
  )
}
