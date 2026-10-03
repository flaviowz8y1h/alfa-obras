import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth, RequirePerfil } from '@/features/auth/RequireAuth'
import { PERFIS_ANALISES } from '@/features/auth/permissoes'
import { EsqueciSenhaPage, NovaSenhaPage } from '@/features/auth/ResetPassword'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LancamentosPage } from '@/features/lancamentos/LancamentosPages'
import { NaoEncontradaPage } from '@/components/nao-encontrada'

// Cadastros carregam sob demanda: o primeiro acesso (login + dashboard) fica mais leve.
const obras = async () => ({ Component: (await import('@/features/obras/ObrasPage')).ObrasPage })
const obraDetalhe = async () => ({
  Component: (await import('@/features/obras/ObraDetalhePage')).ObraDetalhePage,
})
const clientes = async () => ({
  Component: (await import('@/features/clientes/ClientesPage')).ClientesPage,
})
const trabalhadores = async () => ({
  Component: (await import('@/features/trabalhadores/TrabalhadoresPage')).TrabalhadoresPage,
})
const categorias = async () => ({
  Component: (await import('@/features/categorias/CategoriasPage')).CategoriasPage,
})
const saidas = async () => ({
  Component: (await import('@/features/lancamentos/SaidasPage')).SaidasPage,
})
const recebimentos = async () => ({
  Component: (await import('@/features/lancamentos/RecebimentosPage')).RecebimentosPage,
})
const maoDeObra = async () => ({
  Component: (await import('@/features/lancamentos/MaoDeObraPage')).MaoDeObraPage,
})

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/esqueci-senha', element: <EsqueciSenhaPage /> },
  { path: '/nova-senha', element: <NovaSenhaPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            element: (
              <RequirePerfil
                perfis={PERFIS_ANALISES}
                descricao="Esta área é exclusiva de proprietários e administradores."
              />
            ),
            children: [
              {
                path: 'analises',
                lazy: async () => ({
                  Component: (await import('@/features/analises/AnalisesPage')).AnalisesPage,
                }),
              },
            ],
          },
          { path: 'obras', lazy: obras },
          { path: 'obras/:id', lazy: obraDetalhe },
          { path: 'clientes', lazy: clientes },
          { path: 'trabalhadores', lazy: trabalhadores },
          {
            path: 'lancamentos',
            children: [
              { index: true, element: <LancamentosPage /> },
              { path: 'saidas', lazy: saidas },
              { path: 'recebimentos', lazy: recebimentos },
              { path: 'mao-de-obra', lazy: maoDeObra },
            ],
          },
          { path: 'categorias', lazy: categorias },
          {
            element: <RequirePerfil perfis={['owner']} />,
            children: [
              {
                path: 'usuarios',
                lazy: async () => ({
                  Component: (await import('@/features/usuarios/UsuariosPage')).UsuariosPage,
                }),
              },
            ],
          },
          { path: '*', element: <NaoEncontradaPage /> },
        ],
      },
    ],
  },
])
