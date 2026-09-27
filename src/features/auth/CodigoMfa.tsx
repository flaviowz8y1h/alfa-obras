import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'

type Props = {
  /** Retorna mensagem de erro, ou null se deu certo. */
  aoConfirmar: (codigo: string) => Promise<string | null>
  rotuloBotao?: string
  desabilitado?: boolean
}

/** Campo de 6 dígitos do app autenticador. Envia sozinho ao completar. */
export function CodigoMfa({ aoConfirmar, rotuloBotao = 'Confirmar', desabilitado }: Props) {
  const id = useId()
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function confirmar(valor: string) {
    if (valor.length !== 6 || enviando) return
    setEnviando(true)
    setErro(null)
    const mensagem = await aoConfirmar(valor)
    setEnviando(false)
    if (mensagem) {
      setErro(mensagem)
      setCodigo('')
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void confirmar(codigo)
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={id} className="text-sm font-semibold">
          Código de 6 dígitos
        </Label>
        <InputOTP
          id={id}
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={codigo}
          onChange={setCodigo}
          onComplete={(v: string) => void confirmar(v)}
          disabled={desabilitado || enviando}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? `${id}-erro` : undefined}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        {erro && (
          <p id={`${id}-erro`} role="alert" className="text-sm font-medium text-destructive">
            {erro}
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={desabilitado || enviando || codigo.length !== 6}
      >
        {enviando && <Loader2 className="animate-spin" aria-hidden="true" />}
        {enviando ? 'Verificando…' : rotuloBotao}
      </Button>
    </form>
  )
}
