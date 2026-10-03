import { Building2, ChevronRight, Plus, RefreshCw, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { CartaoIndicador, FaixaIndicadores, Painel, TrenaDupla } from '@/components/painel'
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
import { IconeTipo } from '@/features/lancamentos/IconeTipo'
import { situacaoEntrega } from '@/features/obras/alertas'
import { GraficoFluxo } from '@/features/obras/GraficoFluxo'
import { usePermissao } from '@/hooks/use-permissao'
import { cn } from '@/lib/utils'
import type { ResumoObra } from '@/types/app'
import { mensagemDeErro } from '@/utils/erros'
import { formatarData, formatarMoedaCompacta, hojePorExtenso, num } from '@/utils/format'
import { useFluxoEmpresa, useSaidasForaDasObras, useUltimosLancamentos } from './api'
import { type Totais, useResumoObras } from './useResumoObras'
import { PautaSemana } from './PautaSemana'

export function DashboardPage() {
  const podeLancar = usePermissao('lancamentos').criar
  const consulta = useResumoObras()

  return (
    <div className="pauta-semana grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium first-letter:uppercase">
            {hojePorExtenso()}
          </p>
          <h1 className="titulo-semana mt-2 text-4xl font-extrabold uppercase sm:text-5xl">
            Pauta da semana
          </h1>
          {consulta.data && (
            <p className="text-muted-foreground mt-1 text-sm">
              <span className="numero text-foreground font-semibold">
                {consulta.data.totais.emAndamento}
              </span>{' '}
              em andamento de{' '}
              <span className="numero text-foreground font-semibold">
                {consulta.data.totais.obras}
              </span>{' '}
              {consulta.data.totais.obras === 1 ? 'obra' : 'obras'}
            </p>
          )}
        </div>
        {podeLancar && (
          <div className="hidden sm:block">
            <Link to="/lancamentos" className={buttonVariants()}>
              <Plus aria-hidden="true" />
              Novo lançamento
            </Link>
          </div>
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
          <PautaSemana obras={consulta.data.linhas} />
          <TabelaObras linhas={consulta.data.linhas} totais={consulta.data.totais} />
          <div className="grid gap-4 xl:grid-cols-2">
            <PainelFluxo />
            <PainelUltimos />
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- Cards de totais ---------------- */

function CardsTotais({ totais: t }: { totais: Totais }) {
  const consultaFora = useSaidasForaDasObras()
  const fora = consultaFora.data ?? 0
  return (
    <FaixaIndicadores rotulo="Resumo financeiro" className="grid-cols-2 lg:grid-cols-4">
      <CartaoIndicador
        destaque
        grande
        rotulo="Saldo em caixa"
        valor={
          consultaFora.isPending ? (
            '…'
          ) : consultaFora.isError ? (
            'Indisponível'
          ) : (
            <Saldo valor={t.saldo - fora} />
          )
        }
        detalhe={
          consultaFora.isError
            ? 'Não foi possível conferir as despesas fora das obras.'
            : consultaFora.isPending
              ? 'Conferindo despesas fora das obras…'
              : `Recebido ${formatarMoedaCompacta(t.recebido)} · saiu ${formatarMoedaCompacta(t.custo + fora)}`
        }
        className="col-span-2"
      />
      <CartaoIndicador
        indice={1}
        rotulo="A receber"
        valor={<Moeda valor={t.aReceber} />}
        detalhe="Contratado e ainda não recebido."
      />
      <CartaoIndicador
        indice={2}
        rotulo="Custo registrado"
        valor={<Moeda valor={t.custo} />}
        detalhe={
          <>
            Contrato total{' '}
            <span className="numero font-semibold">{formatarMoedaCompacta(t.contratado)}</span>
          </>
        }
      >
        <Trena
          parte={t.custo}
          total={t.contratado}
          rotulo="Custo sobre o contratado"
          cor="var(--serie-saida)"
        />
      </CartaoIndicador>
    </FaixaIndicadores>
  )
}

/* ---------------- Fluxo de caixa ---------------- */

function PainelFluxo() {
  const fluxo = useFluxoEmpresa()
  return (
    <Painel id="titulo-fluxo" titulo="Fluxo de caixa" descricao="Últimos 6 meses, todas as obras">
      {fluxo.isPending ? (
        <Skeleton className="h-60 rounded-lg" />
      ) : fluxo.isError ? (
        <p className="text-destructive text-sm">{mensagemDeErro(fluxo.error)}</p>
      ) : fluxo.data.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          Ainda não há lançamentos para desenhar o fluxo.
        </p>
      ) : (
        <GraficoFluxo pontos={fluxo.data} maxMeses={6} />
      )}
    </Painel>
  )
}

/* ---------------- Últimos lançamentos ---------------- */

function PainelUltimos() {
  const ultimos = useUltimosLancamentos()
  return (
    <Painel
      id="titulo-ultimos"
      titulo="Últimos lançamentos"
      acao={
        <Link to="/lancamentos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Extrato
          <ChevronRight aria-hidden="true" />
        </Link>
      }
    >
      {ultimos.carregando ? (
        <div className="grid gap-3" role="status" aria-label="Carregando lançamentos">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : ultimos.erro ? (
        <p className="text-destructive text-sm">{mensagemDeErro(ultimos.erro)}</p>
      ) : ultimos.itens.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Nenhum lançamento registrado ainda.
        </p>
      ) : (
        <ul className="divide-y">
          {ultimos.itens.map((l) => (
            <li
              key={`${l.tipo}-${l.id}`}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <IconeTipo tipo={l.tipo} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.titulo}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {[l.obra, formatarData(l.data, 'dd/MM')].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Saldo
                valor={l.valor}
                comIcone={false}
                className={cn('text-sm font-semibold', l.valor < 0 && 'text-foreground')}
              />
            </li>
          ))}
        </ul>
      )}
    </Painel>
  )
}

/* ---------------- Obras em andamento ---------------- */

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

function Entrega({ o }: { o: ResumoObra }) {
  const e = situacaoEntrega(o.Status, o.Previsao_Termino)
  return (
    <span
      className={cn(
        'text-xs',
        e.nivel === 'critico'
          ? 'text-negativo font-semibold'
          : e.nivel === 'aviso'
            ? 'text-aviso font-semibold'
            : 'text-muted-foreground',
      )}
    >
      {e.texto}
    </span>
  )
}

function TabelaObras({ linhas, totais }: { linhas: readonly ResumoObra[]; totais: Totais }) {
  // em andamento primeiro; dentro de cada grupo, a entrega mais próxima antes
  const ordenadas = [...linhas].sort(
    (a, b) =>
      Number(b.Status === 'Em Andamento') - Number(a.Status === 'Em Andamento') ||
      (a.Previsao_Termino ?? '9999').localeCompare(b.Previsao_Termino ?? '9999'),
  )

  // grid-cols-1 (= minmax(0,1fr)) aqui e na lista: nomes com reticências alargavam a página no celular
  return (
    <section aria-labelledby="titulo-obras" className="grid min-w-0 grid-cols-1 gap-4 self-start">
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
      <ul className="grid grid-cols-1 gap-3 md:hidden">
        {ordenadas.map((o) => (
          <li key={o.ID_Obra} className="bg-card grid grid-cols-1 gap-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/obras/${o.ID_Obra}`}
                  className="focus-visible:ring-ring/50 block truncate rounded-sm text-base font-semibold underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
                >
                  {o.Nome_Obra ?? 'Obra sem nome'}
                </Link>
                <p className="text-muted-foreground truncate text-sm">{o.Nome_Cliente ?? '—'}</p>
              </div>
              <Saldo valor={o.saldo_caixa} comIcone={false} className="shrink-0 font-bold" />
            </div>
            <TrenaDupla
              compacta
              nome={o.Nome_Obra ?? ''}
              contratado={num(o.valor_contratado)}
              recebido={num(o.total_recebido)}
              custo={num(o.custo_total)}
            />
            <div className="flex items-center justify-between gap-2">
              <StatusObra status={o.Status} />
              <Entrega o={o} />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: tabela */}
      <div className="bg-card hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="h-11 pl-5">Obra</TableHead>
              <TableHead className="w-56">Sobre o contratado</TableHead>
              <TableHead className="text-right">Contratado</TableHead>
              <TableHead className="text-right">Saldo em caixa</TableHead>
              <TableHead
                className="pr-5 text-right"
                title="Contrato menos os custos registrados. Custos futuros não estão descontados."
              >
                Contrato − custo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenadas.map((o) => (
              <TableRow key={o.ID_Obra}>
                <TableCell className="max-w-64 py-3 pl-5">
                  <Link
                    to={`/obras/${o.ID_Obra}`}
                    className="focus-visible:ring-ring/50 block truncate rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
                  >
                    {o.Nome_Obra ?? 'Obra sem nome'}
                  </Link>
                  <p className="text-muted-foreground truncate text-xs">{o.Nome_Cliente ?? '—'}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusObra status={o.Status} />
                    <Entrega o={o} />
                  </div>
                </TableCell>
                <TableCell>
                  <TrenaDupla
                    compacta
                    nome={o.Nome_Obra ?? ''}
                    contratado={num(o.valor_contratado)}
                    recebido={num(o.total_recebido)}
                    custo={num(o.custo_total)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Moeda valor={o.valor_contratado} />
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

/* ---------------- Estados ---------------- */

function SemObras() {
  return (
    <div className="bg-card grid justify-items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <Building2 className="text-muted-foreground size-10" aria-hidden="true" />
      <h2 className="text-xl font-bold">Nenhuma obra cadastrada ainda</h2>
      <p className="text-muted-foreground max-w-sm">
        Quando as obras forem cadastradas, os totais de contrato, recebimentos e custos aparecem
        aqui.
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
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}
