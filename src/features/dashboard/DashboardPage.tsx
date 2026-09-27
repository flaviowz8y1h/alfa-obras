import { Building2, ChevronRight, RefreshCw, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Moeda, Saldo, Trena } from '@/components/valores'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'
import type { ResumoObra } from '@/types/app'
import { mensagemDeErro } from '@/utils/erros'
import { formatarData, formatarMoeda, formatarPorcento, hojePorExtenso } from '@/utils/format'
import { type Totais, useResumoObras } from './useResumoObras'

export function DashboardPage() {
  const { usuario } = useUsuarioLogado()
  const consulta = useResumoObras()
  const primeiroNome = usuario.Nome?.trim().split(/\s+/)[0]

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">
            {hojePorExtenso()}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
            {primeiroNome ? `Olá, ${primeiroNome}` : 'Visão geral'}
          </h1>
        </div>
        {consulta.data && (
          <p className="text-sm text-muted-foreground">
            <span className="numero font-semibold text-foreground">
              {consulta.data.totais.emAndamento}
            </span>{' '}
            em andamento de{' '}
            <span className="numero font-semibold text-foreground">{consulta.data.totais.obras}</span>{' '}
            {consulta.data.totais.obras === 1 ? 'obra' : 'obras'}
          </p>
        )}
      </header>

      {consulta.isPending ? (
        <EsqueletoDashboard />
      ) : consulta.isError ? (
        <Alert variant="destructive" role="alert">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Não foi possível carregar o resumo das obras</AlertTitle>
          <AlertDescription className="grid gap-3">
            <p>{mensagemDeErro(consulta.error)}</p>
            <Button variant="outline" className="w-fit" onClick={() => void consulta.refetch()}>
              <RefreshCw aria-hidden="true" />
              Tentar de novo
            </Button>
          </AlertDescription>
        </Alert>
      ) : consulta.data.linhas.length === 0 ? (
        <SemObras />
      ) : (
        <>
          <CardsTotais totais={consulta.data.totais} />
          <TabelaObras linhas={consulta.data.linhas} totais={consulta.data.totais} />
        </>
      )}
    </div>
  )
}

/* ---------------- Cards de totais ---------------- */

function CardsTotais({ totais: t }: { totais: Totais }) {
  const cards = [
    {
      rotulo: 'Contratado',
      valor: <Moeda valor={t.contratado} />,
      detalhe: `${t.obras} ${t.obras === 1 ? 'obra' : 'obras'} na carteira`,
    },
    {
      rotulo: 'Recebido',
      valor: <Moeda valor={t.recebido} />,
      trena: <Trena parte={t.recebido} total={t.contratado} rotulo="Recebido sobre o contratado" />,
      detalhe: (
        <>
          {formatarPorcento(t.contratado ? t.recebido / t.contratado : 0)} do contratado · faltam{' '}
          <span className="numero">{formatarMoeda(t.aReceber)}</span>
        </>
      ),
    },
    {
      rotulo: 'Custo',
      valor: <Moeda valor={t.custo} />,
      trena: (
        <Trena
          parte={t.custo}
          total={t.contratado}
          rotulo="Custo sobre o contratado"
          cor="var(--chart-4)"
        />
      ),
      detalhe: (
        <>
          Materiais <span className="numero">{formatarMoeda(t.materiais)}</span> · Mão de obra{' '}
          <span className="numero">{formatarMoeda(t.maoDeObra)}</span>
        </>
      ),
    },
    {
      rotulo: 'Saldo em caixa',
      valor: <Saldo valor={t.saldo} />,
      detalhe: (
        <>
          Margem prevista <span className="numero">{formatarMoeda(t.margemPrevista)}</span>
        </>
      ),
      destaque: true,
    },
  ]

  return (
    <section aria-label="Totais da empresa" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c, i) => (
        <article
          key={c.rotulo}
          style={{ animationDelay: `${i * 50}ms` }}
          className={cn(
            'flex animate-entrar flex-col gap-3 rounded-xl border bg-card p-5',
            c.destaque && 'border-transparent bg-marca text-white dark:bg-card dark:ring-1 dark:ring-ring/40',
          )}
        >
          <h2
            className={cn(
              'text-xs font-semibold tracking-wider text-muted-foreground uppercase',
              c.destaque && 'text-white/70 dark:text-muted-foreground',
            )}
          >
            {c.rotulo}
          </h2>
          <p
            className={cn(
              'display text-[1.75rem] leading-none font-bold sm:text-3xl',
              // saldo no card marinho: cores claras para manter contraste
              c.destaque && '[&_.text-negativo]:text-red-300 [&_.text-positivo]:text-green-300',
            )}
          >
            {c.valor}
          </p>
          {c.trena}
          <p className={cn('text-sm text-muted-foreground', c.destaque && 'text-white/75 dark:text-muted-foreground')}>
            {c.detalhe}
          </p>
        </article>
      ))}
    </section>
  )
}

/* ---------------- Tabela por obra ---------------- */

function StatusObra({ status }: { status: string | null }) {
  const s = status ?? 'Sem status'
  const andamento = s === 'Em Andamento'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        andamento ? 'border-ring/40 bg-accent text-accent-foreground' : 'text-muted-foreground',
      )}
    >
      <span
        className={cn('size-1.5 rounded-full', andamento ? 'bg-ring' : 'bg-muted-foreground')}
        aria-hidden="true"
      />
      {s}
    </span>
  )
}

function TabelaObras({ linhas, totais }: { linhas: readonly ResumoObra[]; totais: Totais }) {
  return (
    <section aria-labelledby="titulo-obras" className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="titulo-obras" className="text-xl font-bold">
          Por obra
        </h2>
        <Link to="/obras" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Ver obras
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>

      {/* Celular: uma ficha por obra */}
      <ul className="grid gap-3 md:hidden">
        {linhas.map((o) => (
          <li key={o.ID_Obra} className="grid gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{o.Nome_Obra ?? 'Obra sem nome'}</p>
                <p className="truncate text-sm text-muted-foreground">{o.Nome_Cliente ?? '—'}</p>
              </div>
              <StatusObra status={o.Status} />
            </div>
            <Trena
              parte={o.total_recebido ?? 0}
              total={o.valor_contratado ?? 0}
              rotulo={`Recebido da obra ${o.Nome_Obra ?? ''}`}
            />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Linha rotulo="Contratado" valor={<Moeda valor={o.valor_contratado} />} />
              <Linha rotulo="Recebido" valor={<Moeda valor={o.total_recebido} />} />
              <Linha rotulo="Custo" valor={<Moeda valor={o.custo_total} />} />
              <Linha rotulo="Saldo" valor={<Saldo valor={o.saldo_caixa} comIcone={false} />} forte />
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop: tabela */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="h-11 pl-5">Obra</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Contratado</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Saldo em caixa</TableHead>
              <TableHead className="pr-5 text-right">Margem prevista</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((o) => (
              <TableRow key={o.ID_Obra}>
                <TableCell className="max-w-64 py-3 pl-5">
                  <p className="truncate font-semibold">{o.Nome_Obra ?? 'Obra sem nome'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.Nome_Cliente ?? '—'}
                    {o.Previsao_Termino && ` · prev. ${formatarData(o.Previsao_Termino)}`}
                  </p>
                </TableCell>
                <TableCell>
                  <StatusObra status={o.Status} />
                </TableCell>
                <TableCell className="text-right">
                  <Moeda valor={o.valor_contratado} />
                </TableCell>
                <TableCell className="text-right">
                  <Moeda valor={o.total_recebido} />
                  <Trena
                    parte={o.total_recebido ?? 0}
                    total={o.valor_contratado ?? 0}
                    rotulo={`Recebido da obra ${o.Nome_Obra ?? ''}`}
                    className="mt-1.5 ml-auto h-1 w-24"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Moeda valor={o.custo_total} />
                </TableCell>
                <TableCell className="text-right font-semibold">
                  <Saldo valor={o.saldo_caixa} comIcone={false} />
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Saldo valor={o.margem_prevista} comIcone={false} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="font-semibold">
              <TableCell className="pl-5" colSpan={2}>
                Total
              </TableCell>
              <TableCell className="text-right">
                <Moeda valor={totais.contratado} />
              </TableCell>
              <TableCell className="text-right">
                <Moeda valor={totais.recebido} />
              </TableCell>
              <TableCell className="text-right">
                <Moeda valor={totais.custo} />
              </TableCell>
              <TableCell className="text-right">
                <Saldo valor={totais.saldo} comIcone={false} />
              </TableCell>
              <TableCell className="pr-5 text-right">
                <Saldo valor={totais.margemPrevista} comIcone={false} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  )
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: React.ReactNode; forte?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className={cn('text-[0.9375rem]', forte && 'font-bold')}>{valor}</dd>
    </div>
  )
}

/* ---------------- Estados ---------------- */

function SemObras() {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <Building2 className="size-10 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-xl font-bold">Nenhuma obra cadastrada ainda</h2>
      <p className="max-w-sm text-muted-foreground">
        Quando as obras forem cadastradas, os totais de contrato, recebimentos e custos aparecem aqui.
      </p>
      <Link to="/obras" className={buttonVariants({ className: 'mt-2' })}>
        Ir para Obras
      </Link>
    </div>
  )
}

function EsqueletoDashboard() {
  return (
    <div className="grid gap-8" role="status" aria-label="Carregando resumo das obras">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
