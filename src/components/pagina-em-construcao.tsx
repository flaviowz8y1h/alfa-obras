import { Construction, type LucideIcon } from 'lucide-react'

type Props = { titulo: string; descricao: string; icone?: LucideIcon; children?: React.ReactNode }

export function PaginaEmConstrucao({ titulo, descricao, icone: Icone = Construction, children }: Props) {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{titulo}</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">{descricao}</p>
      </header>
      {children ?? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <Icone className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-semibold">Em construção</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Esta tela chega na próxima fase do sistema.
          </p>
        </div>
      )}
    </div>
  )
}
