import { Camera, ExternalLink, FileText, Loader2, Paperclip, X } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  type EstadoComprovante,
  TIPOS_ACEITOS,
  ehPdf,
  linkComprovante,
  validarArquivo,
} from '@/lib/comprovantes'
import { mensagemDeErro } from '@/utils/erros'

/**
 * Anexar foto ou PDF. O envio de fato acontece ao salvar o formulário
 * (assim um formulário cancelado não deixa arquivo solto no bucket).
 */
export function CampoComprovante({
  valor,
  onChange,
}: {
  valor: EstadoComprovante
  onChange: (v: EstadoComprovante) => void
}) {
  const id = useId()
  const [abrindo, setAbrindo] = useState(false)

  // prévia da foto escolhida; a URL temporária é liberada quando o arquivo muda
  const previa = useMemo(
    () => (valor.novo?.type.startsWith('image/') ? URL.createObjectURL(valor.novo) : null),
    [valor.novo],
  )
  useEffect(() => () => void (previa && URL.revokeObjectURL(previa)), [previa])

  const mostraAtual = valor.atual && !valor.remover && !valor.novo

  async function abrirAtual() {
    if (!valor.atual) return
    setAbrindo(true)
    // abre a aba antes do await para o celular não bloquear como pop-up
    const aba = window.open('', '_blank')
    try {
      const url = await linkComprovante(valor.atual)
      if (aba) aba.location.href = url
      else window.location.href = url
    } catch (e) {
      aba?.close()
      toast.error(mensagemDeErro(e))
    } finally {
      setAbrindo(false)
    }
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold" id={`${id}-rotulo`}>
        Comprovante <span className="font-normal text-muted-foreground">(opcional)</span>
      </p>

      {mostraAtual && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2">
          <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-sm">{ehPdf(valor.atual!) ? 'PDF anexado' : 'Foto anexada'}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => void abrirAtual()} disabled={abrindo}>
            {abrindo ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}
            Ver
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...valor, remover: true })}
            aria-label="Remover comprovante"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}

      {valor.novo && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-2">
          {previa ? (
            <img src={previa} alt="Prévia do comprovante" className="size-14 rounded-md object-cover" />
          ) : (
            <span className="grid size-14 place-items-center rounded-md bg-card">
              <FileText className="size-6 text-muted-foreground" aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{valor.novo.name}</span>
            <span className="block text-xs text-muted-foreground">Será enviado ao salvar</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange({ ...valor, novo: null })}
            aria-label="Descartar arquivo escolhido"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}

      {!mostraAtual && !valor.novo && (
        <label
          htmlFor={id}
          className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-card px-4 text-sm font-medium transition-colors hover:border-ring/50 hover:bg-accent/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <Camera className="size-5 text-muted-foreground" aria-hidden="true" />
          Tirar foto ou anexar arquivo
          <input
            id={id}
            type="file"
            accept={TIPOS_ACEITOS}
            className="sr-only"
            aria-labelledby={`${id}-rotulo`}
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              e.target.value = ''
              if (!arquivo) return
              const erro = validarArquivo(arquivo)
              if (erro) return void toast.error(erro)
              onChange({ ...valor, novo: arquivo })
            }}
          />
        </label>
      )}

      {valor.remover && !valor.novo && (
        <p className="text-sm text-muted-foreground">
          O comprovante atual será removido ao salvar.{' '}
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-4"
            onClick={() => onChange({ ...valor, remover: false })}
          >
            Desfazer
          </button>
        </p>
      )}
    </div>
  )
}
