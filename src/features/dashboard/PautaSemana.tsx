import { addDays, parseISO, startOfWeek } from 'date-fns'
import { ArrowUpRight, CalendarDays, CircleCheck, HardHat } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { ReguaSemana } from '@/components/regua-semana'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePagamentosSemana, useTrabalhadores } from '@/features/trabalhadores/api'
import { alertasDasObras } from '@/features/obras/alertas'
import { usePermissao } from '@/hooks/use-permissao'
import { cn } from '@/lib/utils'
import type { ResumoObra } from '@/types/app'
import { montarSemana } from '@/utils/semana-equipe'
import { mensagemDeErro } from '@/utils/erros'
import { formatarMoeda, paraISO } from '@/utils/format'

export function PautaSemana({ obras }: { obras: readonly ResumoObra[] }) {
  const inicio = paraISO(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const dias = useMemo(
    () => Array.from({ length: 6 }, (_, i) => paraISO(addDays(parseISO(inicio), i))),
    [inicio],
  )
  const trabalhadores = useTrabalhadores()
  const pagamentos = usePagamentosSemana(inicio, dias[5]!)
  const podeLancar = usePermissao('lancamentos').criar
  const carregando = trabalhadores.isPending || pagamentos.isPending || pagamentos.isPlaceholderData
  const erro = trabalhadores.isError
    ? trabalhadores.error
    : pagamentos.isError
      ? pagamentos.error
      : null
  const linhas = useMemo(
    () => montarSemana(dias, pagamentos.data ?? [], trabalhadores.data ?? []),
    [dias, pagamentos.data, trabalhadores.data],
  )
  const alertas = alertasDasObras(obras)
  const semDatas = carregando || erro ? [] : linhas.filter((l) => l.semDatas)
  const pendencias = alertas.length + semDatas.length
  const ativos = (trabalhadores.data ?? []).filter((t) => (t.Status ?? 'Ativo') === 'Ativo').length
  const pago = linhas.reduce((s, l) => s + l.valor, 0)

  return (
    <div className="grid gap-5">
      <ReguaSemana
        dias={dias}
        linhas={linhas}
        carregando={carregando}
        erro={erro ? mensagemDeErro(erro) : undefined}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="titulo-pauta"
          className="bg-card min-w-0 rounded-2xl border p-4 sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="titulo-pauta" className="flex items-center gap-2 text-xl font-bold">
              Pendências{' '}
              <span className="numero bg-aviso-fundo text-aviso grid size-6 place-items-center rounded-full text-xs">
                {pendencias}
                {carregando || erro ? '+' : ''}
              </span>
            </h2>
            <CalendarDays className="text-muted-foreground size-5" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground mb-4 text-sm">
            O que precisa de atenção. As pendências saem da pauta quando os registros são
            corrigidos.
          </p>
          {carregando && (
            <Skeleton
              className="mb-3 h-24 rounded-xl"
              aria-label="Carregando pendências da equipe"
            />
          )}
          {erro && (
            <p role="alert" className="text-destructive mb-4 text-sm">
              Não foi possível verificar a equipe: {mensagemDeErro(erro)}
            </p>
          )}
          <ul className="grid gap-3">
            {semDatas.map((l) => (
              <li
                key={l.trabalhador.ID_Trabalhador}
                className="border-aviso/25 bg-aviso-fundo/40 rounded-xl border p-4"
              >
                <span className="text-aviso text-[10px] font-bold tracking-widest uppercase">
                  Conferir
                </span>
                <h3 className="mt-1 text-base font-bold">
                  {l.trabalhador.Nome_Trabalhador ?? 'Trabalhador'} tem pagamento sem datas
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {formatarMoeda(l.valor)} na semana
                  {l.obras.size > 0 && ` · ${[...l.obras].join(', ')}`} · confira os dias no
                  pagamento de mão de obra.
                </p>
                <Link
                  to="/trabalhadores"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'mt-3 min-h-10',
                  })}
                >
                  Conferir equipe <ArrowUpRight aria-hidden="true" />
                </Link>
              </li>
            ))}
            {alertas.map((a) => (
              <li
                key={a.id}
                className={cn(
                  'bg-muted/25 rounded-xl border p-4',
                  a.nivel === 'critico' && 'border-negativo/25 bg-negativo-fundo/40',
                )}
              >
                <span
                  className={cn(
                    'text-[10px] font-bold tracking-widest uppercase',
                    a.nivel === 'critico' ? 'text-negativo' : 'text-aviso',
                  )}
                >
                  {a.id.endsWith('-prazo') || a.id.endsWith('-entrega') ? 'Prazo' : 'Financeiro'}
                </span>
                <h3 className="mt-1 text-base font-bold">{a.titulo}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{a.texto}</p>
                <Link
                  to={a.acao.para}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'mt-3 min-h-10',
                  })}
                >
                  {a.acao.rotulo} <ArrowUpRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          {pendencias === 0 && !carregando && !erro && (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <CircleCheck className="text-positivo mx-auto mb-3 size-7" aria-hidden="true" />
              <p className="font-semibold">Tudo em dia na pauta</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Nenhum alerta de obra ou pagamento com datas faltando nesta semana.
              </p>
            </div>
          )}
        </section>
        <aside className="grid min-w-0 gap-4" aria-label="Resumo e ações da semana">
          <section className="bg-card rounded-2xl border p-5">
            <div className="flex items-center gap-2">
              <HardHat className="text-primary size-5" aria-hidden="true" />
              <h2 className="text-lg font-bold">Equipe nesta semana</h2>
            </div>
            {carregando ? (
              <Skeleton className="mt-4 h-24" />
            ) : erro ? (
              <p className="text-muted-foreground mt-4 text-sm">Resumo da equipe indisponível.</p>
            ) : (
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Pago na semana</dt>
                  <dd className="numero font-mono font-semibold">{formatarMoeda(pago)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Equipe ativa</dt>
                  <dd className="numero font-semibold">{ativos} pessoas</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Dias pagos confirmados</dt>
                  <dd className="numero font-semibold">
                    {linhas.reduce((s, l) => s + l.dias.size, 0)}
                  </dd>
                </div>
              </dl>
            )}
            <Link
              to="/trabalhadores"
              className={buttonVariants({ variant: 'outline', className: 'mt-5 w-full' })}
            >
              Abrir semana da equipe <ArrowUpRight aria-hidden="true" />
            </Link>
          </section>
          {podeLancar && (
            <section className="bg-card rounded-2xl border p-5">
              <h2 className="text-lg font-bold">Lançar agora</h2>
              <div className="mt-4 grid gap-2">
                <Link to="/lancamentos/mao-de-obra?novo=1" className={buttonVariants()}>
                  Pagar equipe
                </Link>
                <Link
                  to="/lancamentos/recebimentos?novo=1"
                  className={buttonVariants({ variant: 'outline' })}
                >
                  Registrar recebimento
                </Link>
                <Link
                  to="/lancamentos/saidas?novo=1"
                  className={buttonVariants({ variant: 'outline' })}
                >
                  Registrar saída
                </Link>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
