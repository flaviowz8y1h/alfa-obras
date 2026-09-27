import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { mensagemDeErro } from '@/utils/erros'
import { AuthLayout } from './AuthLayout'
import { CodigoMfa } from './CodigoMfa'
import { useAuth } from './auth-context'

export function MfaVerifyForm() {
  const fator = useQuery({
    queryKey: ['mfa', 'fatores'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      const totp = data.totp[0]
      if (!totp) throw new Error('Nenhum autenticador cadastrado.')
      return totp
    },
    staleTime: Infinity,
  })

  if (fator.isError) {
    return (
      <p role="alert" className="text-sm font-medium text-destructive">
        Não encontramos seu autenticador. Saia e entre de novo, ou fale com o suporte.
      </p>
    )
  }

  return (
    <CodigoMfa
      desabilitado={!fator.data}
      rotuloBotao="Verificar e entrar"
      aoConfirmar={async (codigo) => {
        if (!fator.data) return 'Aguarde carregar o autenticador.'
        const { error } = await supabase.auth.mfa.challengeAndVerify({
          factorId: fator.data.id,
          code: codigo,
        })
        // sucesso dispara MFA_CHALLENGE_VERIFIED e o AuthProvider avança sozinho
        return error ? mensagemDeErro(error) : null
      }}
    />
  )
}

export function MfaVerifyPage() {
  const { sair } = useAuth()
  return (
    <AuthLayout
      titulo="Verificação em duas etapas"
      descricao="Abra o app autenticador (Google Authenticator, Authy ou similar) e digite o código de 6 dígitos da Alfa."
      rodape={
        <Button variant="link" className="h-auto p-0" onClick={() => void sair()}>
          Entrar com outra conta
        </Button>
      }
    >
      <MfaVerifyForm />
    </AuthLayout>
  )
}
