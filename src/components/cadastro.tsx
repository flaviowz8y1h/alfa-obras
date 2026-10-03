import { Loader2, Plus, RefreshCw, Search, SearchX, Trash2, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useDesktop } from '@/hooks/use-media'
import { cn } from '@/lib/utils'
import { mensagemDeErro } from '@/utils/erros'

/* ---------------- Cabeçalho ---------------- */

export function CabecalhoCadastro({
  titulo,
  descricao,
  rotuloNovo,
  aoCriar,
}: {
  titulo: string
  descricao: string
  rotuloNovo?: string
  aoCriar?: () => void
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{titulo}</h1>
        <p className="mt-1 text-muted-foreground">{descricao}</p>
      </div>
      {aoCriar && rotuloNovo && (
        <>
          <Button onClick={aoCriar} className="hidden md:inline-flex">
            <Plus aria-hidden="true" />
            {rotuloNovo}
          </Button>
          {/* celular: botão flutuante acima do menu inferior, ao alcance do polegar */}
          <Button
            onClick={aoCriar}
            size="lg"
            className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 rounded-full pr-5 shadow-lg md:hidden"
          >
            <Plus aria-hidden="true" />
            {rotuloNovo}
          </Button>
        </>
      )}
    </header>
  )
}

/* ---------------- Busca + filtro de status ---------------- */

export function BarraFiltros<S extends string>({
  busca,
  aoBuscar,
  placeholder,
  filtros = [],
  filtro,
  aoFiltrar,
}: {
  busca: string
  aoBuscar: (v: string) => void
  placeholder: string
  filtros?: readonly { valor: S; rotulo: string; total?: number }[]
  filtro?: S
  aoFiltrar?: (v: S) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          // espaço do botão "limpar" só quando ele aparece; sem isso o texto de ajuda era cortado
          className={cn('pl-10 text-ellipsis', busca && 'pr-11')}
        />
        {busca && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-0.5 -translate-y-1/2"
            onClick={() => aoBuscar('')}
            aria-label="Limpar busca"
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      {filtros.length > 0 && (
      <div
        role="radiogroup"
        aria-label="Filtrar por status"
        className="flex min-w-0 overflow-x-auto rounded-lg border bg-card p-1"
      >
        {filtros.map((f) => {
          const ativo = f.valor === filtro
          return (
            <button
              key={f.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoFiltrar?.(f.valor)}
              className={cn(
                'flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 sm:flex-none',
                'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                ativo ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.rotulo}
              {f.total !== undefined && (
                <span className={cn('numero text-xs', ativo ? 'opacity-80' : 'opacity-70')}>{f.total}</span>
              )}
            </button>
          )
        })}
      </div>
      )}
    </div>
  )
}

/* ---------------- Estados da lista ---------------- */

export function ListaCarregando() {
  return (
    <div role="status" aria-label="Carregando" className="grid gap-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-18 rounded-xl" />
      ))}
    </div>
  )
}

export function ListaErro({ erro, aoTentar }: { erro: unknown; aoTentar: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>Não foi possível carregar a lista</AlertTitle>
      <AlertDescription className="grid gap-3">
        <p>{mensagemDeErro(erro)}</p>
        <Button variant="outline" className="w-fit" onClick={aoTentar}>
          <RefreshCw aria-hidden="true" />
          Tentar de novo
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export function ListaVazia({
  icone: Icone,
  titulo,
  texto,
  filtrando,
  aoLimpar,
  acao,
}: {
  icone: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  titulo: string
  texto: string
  filtrando: boolean
  aoLimpar: () => void
  acao?: React.ReactNode
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      {filtrando ? (
        <>
          <SearchX className="size-10 text-muted-foreground" aria-hidden={true} />
          <p className="text-lg font-semibold">Nada encontrado</p>
          <p className="max-w-sm text-sm text-muted-foreground">Tente outro termo ou mude o filtro.</p>
          <Button variant="outline" onClick={aoLimpar}>
            Limpar filtros
          </Button>
        </>
      ) : (
        <>
          <Icone className="size-10 text-muted-foreground" aria-hidden={true} />
          <p className="text-lg font-semibold">{titulo}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{texto}</p>
          {acao}
        </>
      )}
    </div>
  )
}

/* ---------------- Status ---------------- */

export function SeloStatus({ status }: { status: string | null }) {
  const s = status ?? '—'
  const positivo = s === 'Ativo' || s === 'Em Andamento'
  const neutro = s === 'Concluída'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        positivo && 'border-ring/40 bg-accent text-accent-foreground',
        neutro && 'border-positivo/40 text-positivo',
        !positivo && !neutro && 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          positivo ? 'bg-ring' : neutro ? 'bg-positivo' : 'bg-muted-foreground',
        )}
        aria-hidden="true"
      />
      {s}
    </span>
  )
}

/* ---------------- Painel do formulário ---------------- */

/**
 * Formulário em painel: lateral no desktop, de baixo para cima no celular.
 * Rodapé fixo com as ações para o botão salvar ficar sempre visível.
 */
export function PainelFormulario({
  aberto,
  aoFechar,
  titulo,
  descricao,
  idFormulario,
  salvando,
  rotuloSalvar = 'Salvar',
  salvarENovo = false,
  aoExcluir,
  children,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  descricao?: string
  idFormulario: string
  salvando: boolean
  rotuloSalvar?: string
  /**
   * Mostra "Salvar e lançar outro" (submit com name="continuar").
   * O formulário detecta pelo `event.nativeEvent.submitter`.
   */
  salvarENovo?: boolean
  aoExcluir?: () => void
  children: React.ReactNode
}) {
  const desktop = useDesktop()
  return (
    <Sheet open={aberto} onOpenChange={(v) => !v && !salvando && aoFechar()}>
      <SheetContent
        side={desktop ? 'right' : 'bottom'}
        className={cn(
          'gap-0 p-0',
          desktop ? 'w-full sm:max-w-md' : 'max-h-[92dvh] rounded-t-2xl',
        )}
      >
        <div className="border-b px-5 pt-5 pb-4">
          <SheetTitle className="text-xl font-bold">{titulo}</SheetTitle>
          {descricao && <SheetDescription className="mt-1">{descricao}</SheetDescription>}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        <div className="pb-seguro flex flex-wrap items-center gap-2 border-t bg-card px-5 py-4">
          {salvarENovo && (
            <Button
              type="submit"
              form={idFormulario}
              name="continuar"
              variant="secondary"
              disabled={salvando}
              className="order-last w-full sm:order-none sm:w-auto"
            >
              Salvar e lançar outro
            </Button>
          )}
          {aoExcluir && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={aoExcluir}
              disabled={salvando}
              aria-label="Excluir"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
          <Button type="button" variant="outline" className="ml-auto" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} disabled={salvando} className="min-w-28">
            {salvando && <Loader2 className="animate-spin" aria-hidden="true" />}
            {salvando ? 'Salvando…' : rotuloSalvar}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ---------------- Confirmar exclusão ---------------- */

export function ConfirmarExclusao({
  aberto,
  aoFechar,
  titulo,
  texto,
  aoConfirmar,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  texto: React.ReactNode
  /** Retorna true se excluiu. */
  aoConfirmar: () => Promise<boolean>
}) {
  const [excluindo, setExcluindo] = useState(false)
  return (
    <AlertDialog open={aberto} onOpenChange={(v) => !v && !excluindo && aoFechar()}>
      <AlertDialogContent>
        <div className="grid gap-2">
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{texto}</AlertDialogDescription>
        </div>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" disabled={excluindo} />}>
            Cancelar
          </AlertDialogClose>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={excluindo}
            onClick={async () => {
              setExcluindo(true)
              const ok = await aoConfirmar()
              setExcluindo(false)
              if (ok) aoFechar()
            }}
          >
            {excluindo && <Loader2 className="animate-spin" aria-hidden="true" />}
            Excluir definitivamente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
