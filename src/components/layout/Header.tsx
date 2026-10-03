import { Monograma } from '@/components/marca'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { MenuUsuario } from './MenuUsuario'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTema } from '@/hooks/use-tema'

export function Header() {
  const { nomeEmpresa } = useUsuarioLogado()
  const { escuro, alternar } = useTema()

  return (
    <header className="bg-background/90 supports-backdrop-filter:bg-background/75 sticky top-0 z-30 border-b backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Monograma className="text-marca size-9 shrink-0 lg:hidden dark:text-white" />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Empresa
            </p>
            <p className="truncate text-base leading-tight font-semibold">{nomeEmpresa}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={alternar}
            aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={escuro ? 'Tema claro' : 'Tema escuro'}
          >
            {escuro ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
          <MenuUsuario />
        </div>
      </div>
    </header>
  )
}
