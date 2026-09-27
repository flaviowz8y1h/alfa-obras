import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Campo } from '@/components/campo'
import { TelaCarregando } from '@/components/tela-carregando'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { mensagemDeErro } from '@/utils/erros'
import { AuthLayout } from './AuthLayout'
import { MfaVerifyForm } from './MfaVerifyPage'
import { useAuth } from './auth-context'

const linkVoltar = (
  <Link to="/login" className="inline-flex items-center gap-1 font-medium text-ring hover:underline">
    <ArrowLeft className="size-4" aria-hidden="true" />
    Voltar para o login
  </Link>
)

/* ---------- Pedir o link ---------- */

const esquemaEmail = z.object({ email: z.email('Informe um e-mail válido.') })

export function EsqueciSenhaPage() {
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof esquemaEmail>>({ resolver: zodResolver(esquemaEmail) })

  async function enviar({ email }: { email: string }) {
    setErro(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })
    // Não revelamos se o e-mail existe: só falhas de rede/limite viram erro.
    if (error && error.status !== 400 && error.code !== 'user_not_found') {
      setErro(mensagemDeErro(error))
      return
    }
    setEnviadoPara(email)
  }

  if (enviadoPara) {
    return (
      <AuthLayout titulo="Confira seu e-mail" rodape={linkVoltar}>
        <div className="flex gap-3 rounded-xl border bg-card p-5">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-ring" aria-hidden="true" />
          <p className="text-base">
            Se <strong className="break-all">{enviadoPara}</strong> estiver cadastrado, você vai
            receber um link para criar uma nova senha. Ele vale por pouco tempo.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Recuperar senha"
      descricao="Informe seu e-mail e enviaremos um link para criar uma nova senha."
      rodape={linkVoltar}
    >
      <form onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        {erro && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{erro}</AlertDescription>
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
            />
          )}
        </Campo>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          Enviar link
        </Button>
      </form>
    </AuthLayout>
  )
}

/* ---------- Definir a nova senha (destino do link do e-mail) ---------- */

const esquemaSenha = z
  .object({
    senha: z
      .string()
      .min(8, 'Use pelo menos 8 caracteres.')
      .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra.')
      .regex(/\d/, 'Inclua pelo menos um número.'),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, {
    path: ['confirmacao'],
    message: 'As senhas não conferem.',
  })

export function NovaSenhaPage() {
  const { estado } = useAuth()
  const navigate = useNavigate()
  const [erro, setErro] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof esquemaSenha>>({ resolver: zodResolver(esquemaSenha) })

  if (estado.status === 'carregando') return <TelaCarregando texto="Validando link…" />

  if (estado.status === 'deslogado' || estado.status === 'erro') {
    return (
      <AuthLayout
        titulo="Link inválido ou expirado"
        descricao="Peça um novo link de recuperação para continuar."
        rodape={linkVoltar}
      >
        <Link to="/esqueci-senha" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          Pedir novo link
        </Link>
      </AuthLayout>
    )
  }

  // Conta com MFA: o Supabase exige aal2 para trocar a senha.
  if (estado.status === 'mfa_verificacao') {
    return (
      <AuthLayout
        titulo="Confirme que é você"
        descricao="Antes de trocar a senha, digite o código do seu app autenticador."
      >
        <MfaVerifyForm />
      </AuthLayout>
    )
  }

  async function salvar({ senha }: { senha: string }) {
    setErro(null)
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setErro(mensagemDeErro(error))
      return
    }
    toast.success('Senha alterada com sucesso.')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout titulo="Criar nova senha" descricao="Escolha uma senha que você não usa em outros sites.">
      <form onSubmit={handleSubmit(salvar)} className="grid gap-5" noValidate>
        {erro && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}
        <Campo
          rotulo="Nova senha"
          erro={errors.senha?.message}
          ajuda="Mínimo de 8 caracteres, com letras e números."
        >
          {(a11y) => (
            <Input {...a11y} {...register('senha')} type="password" autoComplete="new-password" />
          )}
        </Campo>
        <Campo rotulo="Repita a nova senha" erro={errors.confirmacao?.message}>
          {(a11y) => (
            <Input
              {...a11y}
              {...register('confirmacao')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </Campo>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  )
}
