import { NavLink } from 'react-router'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'
import { NAVEGACAO, type ItemNav, visivelPara } from './navegacao'

const classeLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] font-medium transition-colors duration-150',
    'focus-visible:ring-3 focus-visible:ring-sidebar-ring/60 focus-visible:outline-none',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:-left-3 before:w-1 before:rounded-r-full before:bg-dourado'
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
  const { perfil } = useUsuarioLogado()

  return (
    <aside className="sticky top-0 isolate hidden h-dvh w-64 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex flex-col items-center px-6 pt-4 pb-3">
        <img
          src="/logo-alfa-clara.webp"
          alt="Alfa Construções — Engenharia de alto padrão"
          width={1024}
          height={1022}
          className="h-auto w-32"
          decoding="async"
        />
        <p className="mt-2 text-center text-xs leading-snug text-sidebar-foreground/75">
          Obras de alto padrão.
          <br />
          Compromisso em cada etapa.
        </p>
      </div>

      <nav
        aria-label="Principal"
        className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-color:var(--sidebar-accent)_transparent] [scrollbar-width:thin]"
      >
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

      {/* Marca d'água: fachada de obra entregue, subindo do rodapé por trás do menu */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10">
        <img
          src="/fachada-menu.webp"
          alt=""
          width={560}
          height={533}
          className="block h-auto w-full opacity-[0.22]"
          loading="lazy"
          decoding="async"
        />
        {/* degradê: a foto some para cima, no azul do menu */}
        <div className="absolute inset-0 bg-linear-to-b from-sidebar via-sidebar/60 via-40% to-sidebar/10" />
      </div>
    </aside>
  )
}
