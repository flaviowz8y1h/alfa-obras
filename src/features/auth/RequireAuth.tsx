import { RefreshCw, ShieldAlert } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { TelaCarregando } from '@/components/tela-carregando'
import { Button } from '@/components/ui/button'
import type { Perfil } from '@/types/app'
import { AuthLayout } from './AuthLayout'
import { MfaVerifyPage } from './MfaVerifyPage'
import { useAuth, useUsuarioLogado } from './auth-context'

// Cadastro do MFA é raro (uma vez por owner) e traz o gerador de QR code: carrega só quando precisa.
const MfaEnrollPage = lazy(async () => ({
  default: (await import('./MfaEnrollPage')).MfaEnrollPage,
}))

/** Libera as rotas filhas só com sessão válida — e aal2 quando o perfil exige. */
export function RequireAuth() {
  const { estado, recarregar, sair } = useAuth()
  const location = useLocation()

  switch (estado.status) {
    case 'carregando':
      return <TelaCarregando />
    case 'deslogado':
      return <Navigate to="/login" replace state={{ de: location.pathname }} />
    case 'mfa_verificacao':
      return <MfaVerifyPage />
    case 'mfa_cadastro':
      return (
        <Suspense fallback={<TelaCarregando />}>
          <MfaEnrollPage />
        </Suspense>
      )
    case 'erro':
      return (
        <AuthLayout titulo="Não conseguimos carregar sua conta" descricao={estado.mensagem}>
          <div className="grid gap-3">
            <Button size="lg" onClick={recarregar}>
              <RefreshCw aria-hidden="true" />
              Tentar de novo
            </Button>
            <Button size="lg" variant="outline" onClick={() => void sair()}>
              Sair
            </Button>
          </div>
        </AuthLayout>
      )
    case 'pronto':
      return <Outlet />
  }
}

/** Restringe uma rota a perfis específicos (a RLS continua sendo a barreira real). */
export function RequirePerfil({
  perfis,
  descricao = 'Esta área é exclusiva do proprietário da conta.',
}: {
  perfis: readonly Perfil[]
  descricao?: string
}) {
  const { perfil } = useUsuarioLogado()
  if (perfis.includes(perfil)) return <Outlet />
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 py-20 text-center">
      <ShieldAlert className="text-muted-foreground size-10" aria-hidden="true" />
      <h1 className="text-xl font-bold">Acesso restrito</h1>
      <p className="text-muted-foreground">{descricao}</p>
    </div>
  )
}
