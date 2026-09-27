import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation } from 'react-router'
import { z } from 'zod'
import { Campo } from '@/components/campo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { mensagemDeErro } from '@/utils/erros'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './auth-context'

const esquema = z.object({
  email: z.email('Informe um e-mail válido.'),
  senha: z.string().min(1, 'Informe a senha.'),
})
type Dados = z.infer<typeof esquema>

export function LoginPage() {
  const { estado, aviso, limparAviso } = useAuth()
  const location = useLocation()
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Dados>({ resolver: zodResolver(esquema) })

  // Já autenticado (ou no meio do MFA): o guard decide a próxima tela.
  if (estado.status !== 'deslogado' && estado.status !== 'erro' && estado.status !== 'carregando') {
    const destino = (location.state as { de?: string } | null)?.de ?? '/'
    return <Navigate to={destino} replace />
  }

  async function entrar({ email, senha }: Dados) {
    setErro(null)
    limparAviso()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro(mensagemDeErro(error))
  }

  return (
    <AuthLayout
      titulo="Entrar"
      descricao="Use o e-mail e a senha cadastrados pelo responsável da empresa."
      rodape="Não tem acesso? Peça ao proprietário da conta para cadastrar você."
    >
      <form onSubmit={handleSubmit(entrar)} className="grid gap-5" noValidate>
        {(aviso || erro) && (
          <Alert variant="destructive" role="alert">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>{aviso ? 'Acesso bloqueado' : 'Não foi possível entrar'}</AlertTitle>
            <AlertDescription>{aviso ?? erro}</AlertDescription>
          </Alert>
        )}

        <Campo rotulo="E-mail" erro={errors.email?.message}>
          {(a11y) => (
            <Input
              {...a11y}
              {...register('email')}
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="voce@empresa.com.br"
            />
          )}
        </Campo>

        <Campo
          rotulo="Senha"
          erro={errors.senha?.message}
          acaoRotulo={
            <Link
              to="/esqueci-senha"
              className="rounded-sm text-sm font-medium text-ring underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Esqueci a senha
            </Link>
          }
        >
          {(a11y) => (
            <div className="relative">
              <Input
                {...a11y}
                {...register('senha')}
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-0.5 -translate-y-1/2"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
              >
                {mostrarSenha ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            </div>
          )}
        </Campo>

        <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  )
}
