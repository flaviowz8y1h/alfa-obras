import { NavLink } from 'react-router'
import { Monograma } from '@/components/marca'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'
import { NAVEGACAO, type ItemNav, visivelPara } from './navegacao'

const classeLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] font-medium transition-colors duration-150',
    'focus-visible:ring-3 focus-visible:ring-sidebar-ring/60 focus-visible:outline-none',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:-left-3 before:w-1 before:rounded-r-full before:bg-white'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
  )

function Link({ item, recuo = false }: { item: ItemNav; recuo?: boolean }) {
  const Icone = item.icone
  return (
    <NavLink to={item.para} end={item.para === '/'} className={(s) => cn(classeLink(s), recuo && 'pl-9')}>
      <Icone className="size-[1.125rem] shrink-0" aria-hidden="true" />
      {item.rotulo}
    </NavLink>
  )
}

export function Sidebar() {
  const { perfil, nomeEmpresa } = useUsuarioLogado()

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-3 px-6 pt-6 pb-8">
        <Monograma className="size-10 text-white" />
        <div className="min-w-0">
          <p className="display text-base leading-none font-extrabold tracking-wider text-white uppercase">
            Alfa
          </p>
          <p className="mt-1 truncate text-xs text-sidebar-foreground/70">{nomeEmpresa}</p>
        </div>
      </div>

      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3">
        <ul className="grid gap-1">
          {NAVEGACAO.filter((i) => visivelPara(i, perfil)).map((item) => (
            <li key={item.para}>
              {item.filhos ? (
                <>
                  <p className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wider text-sidebar-foreground/55 uppercase">
                    {item.rotulo}
                  </p>
                  <ul className="grid gap-1">
                    {item.filhos.map((filho) => (
                      <li key={filho.para}>
                        <Link item={filho} />
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4" />
                </>
              ) : (
                <Link item={item} />
              )}
            </li>
          ))}
        </ul>
      </nav>

      <p className="px-6 py-5 text-xs text-sidebar-foreground/50">Engenharia de alto padrão</p>
    </aside>
  )
}
