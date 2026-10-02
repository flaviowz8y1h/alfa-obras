import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatarTelefone } from '@/utils/texto'

/*
 * Campos de formulário próprios do sistema.
 * O select é nativo de propósito: no celular abre o seletor do sistema, que é
 * maior e mais fácil de usar com a mão suja de obra do que um popover.
 */

type SelectProps = React.ComponentProps<'select'> & {
  opcoes: readonly (string | { valor: string; rotulo: string })[]
  vazio?: string
}

export function SelectNativo({ opcoes, vazio, className, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-12 w-full cursor-pointer appearance-none rounded-lg border border-input bg-card pr-10 pl-3.5 text-base transition-colors outline-none md:h-11',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
          'disabled:cursor-not-allowed disabled:opacity-50 dark:bg-muted/60',
          className,
        )}
        {...props}
      >
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => {
          const { valor, rotulo } = typeof o === 'string' ? { valor: o, rotulo: o } : o
          return (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          )
        })}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}

type ControladoProps<T> = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: T
  onChange: (valor: T) => void
}

const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Valor em reais digitado como caixa registradora: cada dígito entra pela direita
 * (1 → 0,01 → 0,12 → 1,23). Sem vírgula para errar e teclado numérico no celular.
 */
export function CampoMoeda({ value, onChange, className, ...props }: ControladoProps<number | null>) {
  const texto = value == null ? '' : brl.format(value)
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base text-muted-foreground"
        aria-hidden="true"
      >
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={cn('numero pl-11 text-right font-mono text-lg font-medium', className)}
        value={texto}
        placeholder="0,00"
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, '').slice(0, 13)
          onChange(digitos ? Number(digitos) / 100 : null)
        }}
      />
    </div>
  )
}

export function CampoTelefone({ value, onChange, ...props }: ControladoProps<string>) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(00) 00000-0000"
      value={formatarTelefone(value)}
      onChange={(e) => onChange(formatarTelefone(e.target.value))}
    />
  )
}

/** Input com sugestões (datalist): aceita valor novo, mas sugere os comuns. */
export function InputSugestoes({
  sugestoes,
  ...props
}: React.ComponentProps<'input'> & { sugestoes: readonly string[] }) {
  const idLista = useId()
  return (
    <>
      <Input {...props} list={idLista} autoComplete="off" />
      <datalist id={idLista}>
        {sugestoes.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  )
}
