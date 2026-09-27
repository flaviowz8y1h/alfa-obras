import { Check, Copy, Loader2, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { mensagemDeErro } from '@/utils/erros'
import { AuthLayout } from './AuthLayout'
import { CodigoMfa } from './CodigoMfa'
import { useAuth } from './auth-context'

type Cadastro = { factorId: string; uri: string; segredo: string }

async function iniciarCadastro(): Promise<Cadastro> {
  // Limpa tentativas anteriores não confirmadas para não acumular fatores pendentes.
  const { data: fatores, error: erroLista } = await supabase.auth.mfa.listFactors()
  if (erroLista) throw erroLista
  const pendentes = fatores.all.filter((f) => f.factor_type === 'totp' && f.status !== 'verified')
  await Promise.all(pendentes.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })))

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Alfa ${new Date().toISOString().slice(0, 16)}`,
  })
  if (error) throw error
  return { factorId: data.id, uri: data.totp.uri, segredo: data.totp.secret }
}

export function MfaEnrollPage() {
  const { sair } = useAuth()
  const [cadastro, setCadastro] = useState<Cadastro | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const iniciou = useRef(false)

  useEffect(() => {
    // StrictMode roda o efeito duas vezes em dev; o enroll não pode duplicar.
    if (iniciou.current) return
    iniciou.current = true
    iniciarCadastro()
      .then(setCadastro)
      .catch((e: unknown) => setErro(mensagemDeErro(e)))
  }, [])

  async function copiarSegredo() {
    if (!cadastro) return
    try {
      await navigator.clipboard.writeText(cadastro.segredo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* navegador sem permissão de clipboard: o código continua visível para digitar */
    }
  }

  return (
    <AuthLayout
      titulo="Proteja sua conta"
      descricao="Como proprietário, sua conta exige verificação em duas etapas. Leva menos de um minuto."
      rodape={
        <Button variant="link" className="h-auto p-0" onClick={() => void sair()}>
          Sair e fazer depois
        </Button>
      }
    >
      {erro && (
        <Alert variant="destructive" role="alert" className="mb-6">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <ol className="grid gap-8">
        <li className="grid gap-3">
          <p className="font-semibold">
            <span className="numero mr-2 text-muted-foreground">1.</span>
            Instale um app autenticador
          </p>
          <p className="text-sm text-muted-foreground">
            Google Authenticator, Microsoft Authenticator ou Authy — qualquer um serve.
          </p>
        </li>

        <li className="grid gap-3">
          <p className="font-semibold">
            <span className="numero mr-2 text-muted-foreground">2.</span>
            Escaneie o QR code
          </p>
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start">
            <div className="grid size-44 shrink-0 place-items-center rounded-lg bg-white p-2">
              {cadastro ? (
                <QRCodeSVG
                  value={cadastro.uri}
                  size={160}
                  level="M"
                  title="QR code para cadastrar a Alfa no app autenticador"
                />
              ) : (
                <Loader2 className="size-6 animate-spin text-slate-500" aria-label="Gerando QR code" />
              )}
            </div>
            <div className="grid w-full min-w-0 gap-2">
              <p className="text-sm text-muted-foreground">
                Não consegue escanear? Digite este código no app:
              </p>
              <code className="numero rounded-md bg-muted px-3 py-2 font-mono text-sm break-all select-all">
                {cadastro?.segredo ?? '••••••••••••••••'}
              </code>
              <Button
                type="button"
                variant="outline"
                onClick={() => void copiarSegredo()}
                disabled={!cadastro}
              >
                {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copiado ? 'Copiado' : 'Copiar código'}
              </Button>
            </div>
          </div>
        </li>

        <li className="grid gap-3">
          <p className="font-semibold">
            <span className="numero mr-2 text-muted-foreground">3.</span>
            Confirme com o código gerado
          </p>
          <CodigoMfa
            desabilitado={!cadastro}
            rotuloBotao="Ativar verificação"
            aoConfirmar={async (codigo) => {
              if (!cadastro) return 'Aguarde o QR code.'
              const { data: desafio, error: erroDesafio } = await supabase.auth.mfa.challenge({
                factorId: cadastro.factorId,
              })
              if (erroDesafio) return mensagemDeErro(erroDesafio)
              const { error } = await supabase.auth.mfa.verify({
                factorId: cadastro.factorId,
                challengeId: desafio.id,
                code: codigo,
              })
              return error ? mensagemDeErro(error) : null
            }}
          />
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />A cada novo login, o
            app vai pedir um código novo.
          </p>
        </li>
      </ol>
    </AuthLayout>
  )
}
