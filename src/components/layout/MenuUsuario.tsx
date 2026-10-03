import { LogOut, Moon, Sun } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth, useUsuarioLogado } from '@/features/auth/auth-context'
import { useTema } from '@/hooks/use-tema'
import { PERFIL_ROTULO } from '@/types/app'

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

export function MenuUsuario() {
  const { sair } = useAuth()
  const { usuario, perfil } = useUsuarioLogado()
  const { escuro, alternar } = useTema()
  // O e-mail não aparece na tela: sem nome cadastrado, mostra um rótulo neutro.
  const nome = usuario.Nome?.trim() || 'Minha conta'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1.5 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:px-2"
        aria-label={`Menu do usuário ${nome}`}
      >
        <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {iniciais(nome) || '?'}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-40 truncate text-sm font-semibold">{nome}</span>
          <span className="block text-xs text-muted-foreground">{PERFIL_ROTULO[perfil]}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-0.5 py-2">
            <span className="truncate text-sm font-semibold text-foreground">{nome}</span>
            <span className="truncate font-normal">{PERFIL_ROTULO[perfil]}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={alternar}>
          {escuro ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          {escuro ? 'Tema claro' : 'Tema escuro'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void sair()}>
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
