import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Props = {
  rotulo: string
  erro?: string
  ajuda?: React.ReactNode
  acaoRotulo?: React.ReactNode
  className?: string
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => React.ReactNode
}

/** Label visível + mensagem de erro logo abaixo do campo, ligados por aria. */
export function Campo({ rotulo, erro, ajuda, acaoRotulo, className, children }: Props) {
  const id = useId()
  const idErro = `${id}-erro`
  const idAjuda = `${id}-ajuda`
  const descritores = [erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(' ')

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-semibold">
          {rotulo}
        </Label>
        {acaoRotulo}
      </div>
      {children({ id, 'aria-invalid': Boolean(erro), 'aria-describedby': descritores || undefined })}
      {ajuda && !erro && (
        <p id={idAjuda} className="text-sm text-muted-foreground">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </div>
  )
}
