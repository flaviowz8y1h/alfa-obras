import { Outlet, useLocation } from 'react-router'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          id="conteudo"
          tabIndex={-1}
          // key: reinicia a animação de entrada a cada troca de página
          key={pathname}
          className="w-full max-w-7xl flex-1 animate-entrar px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pb-10"
        >
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
