import { useEffect } from 'react'
import { Outlet, useLocation, useNavigation } from 'react-router'
import { precarregarPaginas } from '@/paginas'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const { pathname } = useLocation()
  const navegando = useNavigation().state !== 'idle'

  // Com o painel aberto, baixa as outras telas sem atrapalhar: a troca de tela fica imediata.
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(precarregarPaginas, { timeout: 4000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(precarregarPaginas, 1500)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="flex min-h-dvh bg-background" aria-busy={navegando}>
      {/* Retorno imediato ao tocar num link enquanto a próxima tela ainda carrega. */}
      {navegando && (
        <div
          className="bg-primary/15 fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
          role="progressbar"
          aria-label="Carregando a página"
        >
          <div className="animate-navegando bg-primary h-full w-2/5 dark:bg-white" />
        </div>
      )}
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
          // grid-cols-1 (= minmax(0,1fr)) na raiz da página: conteúdo sem quebra não alarga a tela no celular
          className="w-full flex-1 animate-entrar [&>.grid]:grid-cols-1 px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pb-10"
        >
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
