import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth, RequirePerfil } from '@/features/auth/RequireAuth'
import { PERFIS_ANALISES } from '@/features/auth/permissoes'
import { EsqueciSenhaPage, NovaSenhaPage } from '@/features/auth/ResetPassword'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LancamentosPage } from '@/features/lancamentos/LancamentosPages'
import { NaoEncontradaPage } from '@/components/nao-encontrada'
import { TelaCarregando } from '@/components/tela-carregando'
import { paginas } from '@/paginas'

const obras = async () => ({ Component: (await paginas.obras()).ObrasPage })
const obraDetalhe = async () => ({ Component: (await paginas.obraDetalhe()).ObraDetalhePage })
const clientes = async () => ({ Component: (await paginas.clientes()).ClientesPage })
const trabalhadores = async () => ({ Component: (await paginas.trabalhadores()).TrabalhadoresPage })
const categorias = async () => ({ Component: (await paginas.categorias()).CategoriasPage })
const saidas = async () => ({ Component: (await paginas.saidas()).SaidasPage })
const recebimentos = async () => ({ Component: (await paginas.recebimentos()).RecebimentosPage })
const maoDeObra = async () => ({ Component: (await paginas.maoDeObra()).MaoDeObraPage })

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/esqueci-senha', element: <EsqueciSenhaPage /> },
  { path: '/nova-senha', element: <NovaSenhaPage /> },
  {
    element: <RequireAuth />,
    // Aberto direto numa tela sob demanda (link, F5), o roteador espera o arquivo: sem isto a tela ficava em branco.
    HydrateFallback: TelaCarregando,
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
                lazy: async () => ({ Component: (await paginas.analises()).AnalisesPage }),
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
                lazy: async () => ({ Component: (await paginas.usuarios()).UsuariosPage }),
              },
            ],
          },
          { path: '*', element: <NaoEncontradaPage /> },
        ],
      },
    ],
  },
])
