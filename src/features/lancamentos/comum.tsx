import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react'
import { useMemo } from 'react'
import { ListaVazia } from '@/components/cadastro'
import { SelectNativo } from '@/components/campos'
import { Moeda } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { deslocarMes, formatarData, formatarMoeda, mesAtual, nomeDoMes, num } from '@/utils/format'
import { type useFiltrosLancamento, useOpcoesObra } from './hooks'

/* ---------------- Filtros: mês + obra ---------------- */

export function FiltrosLancamento({
  mes,
  setMes,
  obra,
  setObra,
}: ReturnType<typeof useFiltrosLancamento>) {
  const { opcoes } = useOpcoesObra(obra || null)
  const noMesAtual = mes === mesAtual()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center rounded-lg border bg-card p-1" role="group" aria-label="Mês">
        <Button variant="ghost" size="icon" onClick={() => setMes(deslocarMes(mes, -1))} aria-label="Mês anterior">
          <ChevronLeft aria-hidden="true" />
        </Button>
        <p className="min-w-40 flex-1 text-center text-base font-semibold first-letter:uppercase" aria-live="polite">
          {nomeDoMes(mes)}
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMes(deslocarMes(mes, 1))}
          disabled={noMesAtual}
          aria-label="Próximo mês"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      {!noMesAtual && (
        <Button variant="link" className="h-auto self-start p-0 sm:self-center" onClick={() => setMes(mesAtual())}>
          Voltar para o mês atual
        </Button>
      )}
      <div className="sm:ml-auto sm:w-80">
        <SelectNativo
          aria-label="Filtrar por obra"
          value={obra}
          onChange={(e) => setObra(e.target.value)}
          vazio="Todas as obras"
          opcoes={opcoes}
        />
      </div>
    </div>
  )
}

/* ---------------- Forma de pagamento (chips) ---------------- */

export function EscolhaOpcao({
  opcoes,
  value,
  onChange,
  rotulo,
  ...a11y
}: {
  opcoes: readonly string[]
  value: string
  onChange: (v: string) => void
  rotulo: string
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} {...a11y} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = o === value
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o)}
            className={cn(
              'min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors duration-150',
              'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              ativo
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-foreground hover:border-ring/50',
            )}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Lista agrupada por dia ---------------- */

export type ItemLancamento<T> = {
  id: string
  data: string | null
  titulo: string
  detalhe: string
  valor: number | string | null
  registro: T
}

export function ListaLancamentos<T>({
  itens,
  tipo,
  aoAbrir,
  podeEditar,
  vazio,
}: {
  itens: readonly ItemLancamento<T>[]
  tipo: 'entrada' | 'saida'
  aoAbrir: (registro: T) => void
  podeEditar: boolean
  vazio: { titulo: string; texto: string; filtrando: boolean; aoLimpar: () => void; acao?: React.ReactNode }
}) {
  const dias = useMemo(() => {
    const mapa = new Map<string, ItemLancamento<T>[]>()
    for (const i of itens) {
      const d = i.data ?? 'sem-data'
      mapa.set(d, [...(mapa.get(d) ?? []), i])
    }
    return [...mapa.entries()]
  }, [itens])

  if (itens.length === 0) return <ListaVazia icone={ReceiptText} {...vazio} />

  return (
    <div className="grid gap-5">
      {dias.map(([dia, lista]) => {
        const totalDia = lista.reduce((s, i) => s + num(i.valor), 0)
        return (
          <section key={dia} aria-label={formatarData(dia, "EEEE, d 'de' MMMM")} className="grid gap-2">
            <h2 className="flex items-baseline justify-between gap-2 px-1 text-sm">
              <span className="font-semibold first-letter:uppercase">
                {dia === 'sem-data' ? 'Sem data' : formatarData(dia, "EEEE, d 'de' MMMM")}
              </span>
              <span className="numero text-muted-foreground">{formatarMoeda(totalDia)}</span>
            </h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {lista.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => podeEditar && aoAbrir(i.registro)}
                    disabled={!podeEditar}
                    className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-accent/40 focus-visible:bg-accent/60 focus-visible:outline-none disabled:cursor-default"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{i.titulo}</span>
                      <span className="block truncate text-sm text-muted-foreground">{i.detalhe}</span>
                    </span>
                    <Moeda
                      valor={num(i.valor)}
                      className={cn('text-base font-semibold', tipo === 'entrada' && 'text-positivo')}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/* ---------------- Total do período ---------------- */

export function TotalPeriodo({
  rotulo,
  total,
  quantidade,
  tipo,
}: {
  rotulo: string
  total: number
  quantidade: number
  tipo: 'entrada' | 'saida'
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border bg-card px-5 py-4">
      <div>
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{rotulo}</p>
        <p className={cn('display numero mt-1 text-3xl font-bold', tipo === 'entrada' && 'text-positivo')}>
          {formatarMoeda(total)}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="numero font-semibold text-foreground">{quantidade}</span>{' '}
        {quantidade === 1 ? 'lançamento' : 'lançamentos'}
      </p>
    </div>
  )
}
