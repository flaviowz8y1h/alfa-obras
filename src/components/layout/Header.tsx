import { Monograma } from '@/components/marca'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { MenuUsuario } from './MenuUsuario'

export function Header() {
  const { nomeEmpresa } = useUsuarioLogado()

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Monograma className="size-9 shrink-0 text-marca lg:hidden dark:text-white" />
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Empresa
            </p>
            <p className="truncate text-base leading-tight font-semibold">{nomeEmpresa}</p>
          </div>
        </div>
        <MenuUsuario />
      </div>
    </header>
  )
}
