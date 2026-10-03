import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'
import { NAV_INFERIOR, NAVEGACAO, visivelPara } from './navegacao'

const RÓTULO_CURTO: Record<string, string> = {
  '/': 'Início',
  '/lancamentos': 'Lançar',
  '/trabalhadores': 'Equipe',
}

const classeAba = (ativo: boolean) =>
  cn(
    'flex min-h-16 flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150',
    'focus-visible:bg-muted focus-visible:outline-none',
    ativo ? 'text-foreground' : 'text-muted-foreground',
  )

export function BottomNav() {
  const { perfil } = useUsuarioLogado()
  const { pathname } = useLocation()
  const [maisAberto, setMaisAberto] = useState(false)

  const fixos = NAVEGACAO.filter((i) => (NAV_INFERIOR as readonly string[]).includes(i.para))
  const extras = NAVEGACAO.filter(
    (i) => !(NAV_INFERIOR as readonly string[]).includes(i.para) && visivelPara(i, perfil),
  )
  const extraAtivo = extras.some((i) => pathname.startsWith(i.para))

  return (
    <>
      <nav
        aria-label="Principal"
        className="pb-seguro bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur lg:hidden"
      >
        <ul className="flex">
          {fixos.map((item) => {
            const Icone = item.icone
            return (
              <li key={item.para} className="flex flex-1">
                <NavLink
                  to={item.para}
                  end={item.para === '/'}
                  className={({ isActive }) => classeAba(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'grid h-7 w-12 place-items-center rounded-full transition-colors duration-200',
                          isActive && 'bg-primary text-primary-foreground',
                        )}
                      >
                        <Icone className="size-5" aria-hidden="true" />
                      </span>
                      {RÓTULO_CURTO[item.para] ?? item.rotulo}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
          <li className="flex flex-1">
            <button
              type="button"
              className={classeAba(extraAtivo)}
              onClick={() => setMaisAberto(true)}
              aria-haspopup="dialog"
            >
              <span
                className={cn(
                  'grid h-7 w-12 place-items-center rounded-full',
                  extraAtivo && 'bg-primary text-primary-foreground',
                )}
              >
                <Ellipsis className="size-5" aria-hidden="true" />
              </span>
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={maisAberto} onOpenChange={setMaisAberto}>
        <SheetContent side="bottom" className="pb-seguro rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold">Mais opções</SheetTitle>
            <SheetDescription>Análises, cadastros e administração</SheetDescription>
          </SheetHeader>
          <ul className="grid gap-1 px-3 pb-4">
            {extras.map((item) => {
              const Icone = item.icone
              return (
                <li key={item.para}>
                  <NavLink
                    to={item.para}
                    onClick={() => setMaisAberto(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-14 items-center gap-4 rounded-xl px-4 text-base font-medium transition-colors',
                        'focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none',
                        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                      )
                    }
                  >
                    <Icone className="text-muted-foreground size-5" aria-hidden="true" />
                    {item.rotulo}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  )
}
