import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth, RequirePerfil } from '@/features/auth/RequireAuth'
import { EsqueciSenhaPage, NovaSenhaPage } from '@/features/auth/ResetPassword'
import { CategoriasPage } from '@/features/categorias/CategoriasPage'
import { ClientesPage } from '@/features/clientes/ClientesPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import {
  LancamentosPage,
  MaoDeObraPage,
  RecebimentosPage,
  SaidasPage,
} from '@/features/lancamentos/LancamentosPages'
import { ObrasPage } from '@/features/obras/ObrasPage'
import { TrabalhadoresPage } from '@/features/trabalhadores/TrabalhadoresPage'
import { UsuariosPage } from '@/features/usuarios/UsuariosPage'
import { NaoEncontradaPage } from '@/components/nao-encontrada'

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
          { path: 'obras', element: <ObrasPage /> },
          { path: 'clientes', element: <ClientesPage /> },
          { path: 'trabalhadores', element: <TrabalhadoresPage /> },
          {
            path: 'lancamentos',
            children: [
              { index: true, element: <LancamentosPage /> },
              { path: 'saidas', element: <SaidasPage /> },
              { path: 'recebimentos', element: <RecebimentosPage /> },
              { path: 'mao-de-obra', element: <MaoDeObraPage /> },
            ],
          },
          { path: 'categorias', element: <CategoriasPage /> },
          {
            element: <RequirePerfil perfis={['owner']} />,
            children: [{ path: 'usuarios', element: <UsuariosPage /> }],
          },
          { path: '*', element: <NaoEncontradaPage /> },
        ],
      },
    ],
  },
])
