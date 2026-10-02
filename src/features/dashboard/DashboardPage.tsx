import { Building2, ChevronRight, Plus, RefreshCw, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import {
  CartaoIndicador,
  FaixaIndicadores,
  ItemAlerta,
  Painel,
  SemAlertas,
  TrenaDupla,
} from '@/components/painel'
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
import { IconeTipo } from '@/features/lancamentos/IconeTipo'
import { alertasDasObras, situacaoEntrega } from '@/features/obras/alertas'
import { GraficoFluxo } from '@/features/obras/GraficoFluxo'
import { usePermissao } from '@/hooks/use-permissao'
import { cn } from '@/lib/utils'
import type { ResumoObra } from '@/types/app'
import { mensagemDeErro } from '@/utils/erros'
import {
  formatarData,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarPorcento,
  hojePorExtenso,
  num,
} from '@/utils/format'
import { useFluxoEmpresa, useSaidasForaDasObras, useUltimosLancamentos } from './api'
import { type Totais, useResumoObras } from './useResumoObras'

const MAX_ALERTAS = 4

export function DashboardPage() {
  const { usuario } = useUsuarioLogado()
  const podeLancar = usePermissao('lancamentos').criar
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
          {consulta.data && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="numero font-semibold text-foreground">{consulta.data.totais.emAndamento}</span>{' '}
              em andamento de{' '}
              <span className="numero font-semibold text-foreground">{consulta.data.totais.obras}</span>{' '}
              {consulta.data.totais.obras === 1 ? 'obra' : 'obras'}
            </p>
          )}
        </div>
        {podeLancar && (
          <Link to="/lancamentos" className={buttonVariants({ className: 'hidden sm:inline-flex' })}>
            <Plus aria-hidden="true" />
            Novo lançamento
          </Link>
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
          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <PainelFluxo />
            <PainelAtencao linhas={consulta.data.linhas} />
          </div>
          {/* a tabela precisa de ~670px: só divide a linha em telas bem largas */}
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.7fr_1fr]">
            <TabelaObras linhas={consulta.data.linhas} totais={consulta.data.totais} />
            <PainelUltimos />
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- Cards de totais ---------------- */

function CardsTotais({ totais: t }: { totais: Totais }) {
  // o caixa da empresa também paga o que não é de nenhuma obra (equipamentos, despesas gerais)
  const fora = useSaidasForaDasObras().data ?? 0
  return (
    <FaixaIndicadores rotulo="Totais da empresa" className="lg:grid-cols-3 xl:grid-cols-3">
      <CartaoIndicador
        destaque
        grande
        rotulo="Saldo em caixa"
        valor={<Saldo valor={t.saldo - fora} />}
        detalhe={
          <>
            Margem prevista da carteira <span className="numero font-semibold">{formatarMoeda(t.margemPrevista)}</span>
            {fora > 0 && (
              <>
                {' · '}inclui <span className="numero font-semibold">{formatarMoeda(fora)}</span> de equipamentos e despesas
                fora das obras
              </>
            )}
          </>
        }
        className="sm:col-span-2 lg:col-span-3"
      >
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/75 dark:text-muted-foreground">
          <span>
            Entrou <span className="numero font-semibold text-white dark:text-foreground">{formatarMoedaCompacta(t.recebido)}</span>
          </span>
          <span>
            Saiu <span className="numero font-semibold text-white dark:text-foreground">{formatarMoedaCompacta(t.custo + fora)}</span>
          </span>
        </p>
      </CartaoIndicador>
      <CartaoIndicador
        indice={1}
        rotulo="Contratado"
        valor={<Moeda valor={t.contratado} />}
        detalhe={`${t.obras} ${t.obras === 1 ? 'obra' : 'obras'} · ${t.emAndamento} em andamento`}
      />
      <CartaoIndicador
        indice={2}
        rotulo="Recebido"
        valor={<Moeda valor={t.recebido} />}
        detalhe={
          <>
            {formatarPorcento(t.contratado ? t.recebido / t.contratado : 0)} do contratado · faltam{' '}
            <span className="numero">{formatarMoeda(t.aReceber)}</span>
          </>
        }
      >
        <Trena parte={t.recebido} total={t.contratado} rotulo="Recebido sobre o contratado" cor="var(--serie-entrada)" />
      </CartaoIndicador>
      <CartaoIndicador
        indice={3}
        rotulo="Custo"
        valor={<Moeda valor={t.custo} />}
        detalhe={
          <>
            Materiais <span className="numero">{formatarMoeda(t.materiais)}</span> · Mão de obra{' '}
            <span className="numero">{formatarMoeda(t.maoDeObra)}</span>
          </>
        }
      >
        <Trena parte={t.custo} total={t.contratado} rotulo="Custo sobre o contratado" cor="var(--serie-saida)" />
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
        <p className="text-sm text-destructive">{mensagemDeErro(fluxo.error)}</p>
      ) : fluxo.data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Ainda não há lançamentos para desenhar o fluxo.
        </p>
      ) : (
        <GraficoFluxo pontos={fluxo.data} maxMeses={6} />
      )}
    </Painel>
  )
}

/* ---------------- Precisa de atenção ---------------- */

function PainelAtencao({ linhas }: { linhas: readonly ResumoObra[] }) {
  const alertas = alertasDasObras(linhas)
  const visiveis = alertas.slice(0, MAX_ALERTAS)
  return (
    <Painel
      id="titulo-atencao"
      titulo={
        <span className="flex items-center gap-2">
          Precisa de atenção
          {alertas.length > 0 && (
            <span className="numero grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-2 text-xs font-bold text-white">
              {alertas.length}
            </span>
          )}
        </span>
      }
    >
      {visiveis.length === 0 ? (
        <SemAlertas texto="Nenhuma obra em andamento com custo alto, saldo negativo ou prazo apertado." />
      ) : (
        <ul>
          {visiveis.map((a) => (
            <ItemAlerta key={a.id} nivel={a.nivel} titulo={a.titulo} texto={a.texto} acao={a.acao} />
          ))}
        </ul>
      )}
      {alertas.length > MAX_ALERTAS && (
        <Link to="/obras" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'mt-3 w-full' })}>
          Mais {alertas.length - MAX_ALERTAS} em Obras
        </Link>
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
        <p className="text-sm text-destructive">{mensagemDeErro(ultimos.erro)}</p>
      ) : ultimos.itens.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento registrado ainda.</p>
      ) : (
        <ul className="divide-y">
          {ultimos.itens.map((l) => (
            <li key={`${l.tipo}-${l.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <IconeTipo tipo={l.tipo} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[l.obra, formatarData(l.data, 'dd/MM')].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Saldo valor={l.valor} comIcone={false} className={cn('text-sm font-semibold', l.valor < 0 && 'text-foreground')} />
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
        e.nivel === 'critico' ? 'font-semibold text-negativo' : e.nivel === 'aviso' ? 'font-semibold text-aviso' : 'text-muted-foreground',
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

  return (
    <section aria-labelledby="titulo-obras" className="grid min-w-0 gap-4 self-start">
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
        {ordenadas.map((o) => (
          <li key={o.ID_Obra} className="grid gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/obras/${o.ID_Obra}`}
                  className="block truncate rounded-sm text-base font-semibold underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {o.Nome_Obra ?? 'Obra sem nome'}
                </Link>
                <p className="truncate text-sm text-muted-foreground">{o.Nome_Cliente ?? '—'}</p>
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
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="h-11 pl-5">Obra</TableHead>
              <TableHead className="w-56">Sobre o contratado</TableHead>
              <TableHead className="text-right">Contratado</TableHead>
              <TableHead className="text-right">Saldo em caixa</TableHead>
              <TableHead className="pr-5 text-right">Margem prevista</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenadas.map((o) => (
              <TableRow key={o.ID_Obra}>
                <TableCell className="max-w-64 py-3 pl-5">
                  <Link
                    to={`/obras/${o.ID_Obra}`}
                    className="block truncate rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {o.Nome_Obra ?? 'Obra sem nome'}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{o.Nome_Cliente ?? '—'}</p>
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
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}
