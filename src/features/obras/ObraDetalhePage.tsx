import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Building2,
  CalendarClock,
  Pencil,
  Phone,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmarExclusao, ListaErro, SeloStatus } from '@/components/cadastro'
import { CUSTO_ALTO } from '@/components/painel'
import { Moeda, Saldo, Trena } from '@/components/valores'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { cn } from '@/lib/utils'
import type { Obra } from '@/types/app'
import { mensagemDeErro } from '@/utils/erros'
import { formatarData, formatarMoeda, formatarPorcento, hojeISO, num } from '@/utils/format'
import { formatarTelefone } from '@/utils/texto'
import { useExcluirObra } from './api'
import {
  type Movimento,
  type TipoMovimento,
  useExtratoObra,
  useFluxoObra,
  useObra,
  useResumoObra,
} from './api-detalhe'
import { FormObra } from './FormObra'
import { GraficoFluxo } from './GraficoFluxo'

export function ObraDetalhePage() {
  const { id = '' } = useParams()
  const obra = useObra(id)
  const resumo = useResumoObra(id)
  const permissao = usePermissao('obras')
  const podeLancar = usePermissao('lancamentos').criar
  const p = usePainel<Obra>()
  const excluir = useExcluirObra()
  const navigate = useNavigate()

  if (obra.isPending) return <EsqueletoDetalhe />
  if (obra.isError) return <ListaErro erro={obra.error} aoTentar={() => void obra.refetch()} />
  if (!obra.data) {
    return (
      <div className="mx-auto grid max-w-md justify-items-center gap-3 py-20 text-center">
        <Building2 className="size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-xl font-bold">Obra não encontrada</h1>
        <p className="text-muted-foreground">Ela pode ter sido excluída.</p>
        <Link to="/obras" className={buttonVariants({ className: 'mt-2' })}>
          Voltar para Obras
        </Link>
      </div>
    )
  }

  const o = obra.data
  const r = resumo.data
  const contratado = num(r?.valor_contratado ?? o.Valor_Contratado)
  const recebido = num(r?.total_recebido)
  const custo = num(r?.custo_total)
  const atrasada =
    o.Status === 'Em Andamento' && !!o.Previsao_Termino && o.Previsao_Termino < hojeISO()
  // Meta de custo: até CUSTO_ALTO (60%) do contratado; chegando nela, a obra entra em alerta.
  const metaCusto = contratado * CUSTO_ALTO
  const fracaoCusto = contratado > 0 ? custo / contratado : 0
  const metaAtingida = contratado > 0 && fracaoCusto >= CUSTO_ALTO

  return (
    <div className="grid gap-8">
      {/* ---------- Cabeçalho ---------- */}
      <header className="grid gap-4">
        <Link
          to="/obras"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Obras
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold sm:text-4xl">{o.Nome_Obra ?? 'Obra sem nome'}</h1>
              <SeloStatus status={o.Status} />
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
              <span className="font-medium text-foreground">{o.Nome_Cliente ?? 'Sem cliente'}</span>
              {o.Telefone_Cliente && (
                <a
                  href={`tel:${o.Telefone_Cliente.replace(/\D/g, '')}`}
                  className="numero inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {formatarTelefone(o.Telefone_Cliente)}
                </a>
              )}
              <span className="numero inline-flex items-center gap-1">
                <CalendarClock className="size-4" aria-hidden="true" />
                {formatarData(o.Data_Inicio)} → {formatarData(o.Previsao_Termino)}
              </span>
            </p>
          </div>
          {permissao.editar && (
            <Button variant="outline" onClick={() => p.editar(o)}>
              <Pencil aria-hidden="true" />
              Editar obra
            </Button>
          )}
        </div>

        {atrasada && (
          <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" role="status">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            Previsão de término vencida em {formatarData(o.Previsao_Termino)}. Atualize a data ou o status.
          </p>
        )}

        {metaAtingida && o.Status === 'Em Andamento' && (
          <p className="flex items-center gap-2 rounded-lg border border-aviso/40 bg-aviso-fundo px-4 py-3 text-sm font-medium text-aviso" role="status">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            {custo > contratado
              ? `Custo passou do valor contratado em ${formatarMoeda(custo - contratado)}. Revise o orçamento ou negocie um aditivo.`
              : `Meta de custo atingida: o custo chegou a ${formatarPorcento(fracaoCusto)} do contratado (meta: até ${formatarPorcento(CUSTO_ALTO)}).`}
          </p>
        )}

        {podeLancar && (
          <nav aria-label="Lançar nesta obra" className="flex gap-2 overflow-x-auto pb-1">
            <AtalhoLancar para="/lancamentos/recebimentos" obra={o.ID_Obra} icone={ArrowDownToLine}>
              Recebimento
            </AtalhoLancar>
            <AtalhoLancar para="/lancamentos/saidas" obra={o.ID_Obra} icone={ArrowUpFromLine}>
              Saída
            </AtalhoLancar>
            <AtalhoLancar para="/lancamentos/mao-de-obra" obra={o.ID_Obra} icone={Wallet}>
              Mão de obra
            </AtalhoLancar>
          </nav>
        )}
      </header>

      {/* ---------- Números ---------- */}
      <section aria-label="Resumo financeiro da obra" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Cartao rotulo="Contratado" valor={<Moeda valor={contratado} />} detalhe={`Início ${formatarData(o.Data_Inicio)}`} />
        <Cartao
          rotulo="Recebido"
          valor={<Moeda valor={recebido} />}
          trena={<Trena parte={recebido} total={contratado} rotulo="Recebido sobre o contratado" />}
          detalhe={
            <>
              {formatarPorcento(contratado ? recebido / contratado : 0)} · faltam{' '}
              <span className="numero">{formatarMoeda(r?.a_receber)}</span>
            </>
          }
        />
        <Cartao
          rotulo="Custo"
          valor={<Moeda valor={custo} />}
          trena={<Trena parte={custo} total={contratado} rotulo="Custo sobre o contratado" cor="var(--serie-saida)" />}
          detalhe={
            <>
              Material <span className="numero">{formatarMoeda(r?.total_saidas)}</span> · Mão de obra{' '}
              <span className="numero">{formatarMoeda(r?.total_mao_de_obra)}</span>
            </>
          }
        />
        {/* Mesmo indicador do resumo de Obras ("Custo a partir de 60%"), só que desta obra. */}
        <Cartao
          rotulo={`Custo a partir de ${formatarPorcento(CUSTO_ALTO)}`}
          valor={
            contratado > 0 ? (
              <span className={cn('numero', metaAtingida && 'text-aviso')}>{formatarPorcento(fracaoCusto)}</span>
            ) : (
              '—'
            )
          }
          trena={
            contratado > 0 && (
              <Trena
                parte={custo}
                total={metaCusto}
                rotulo={`Custo sobre a meta de ${formatarPorcento(CUSTO_ALTO)}`}
                cor={metaAtingida ? 'var(--aviso)' : 'var(--serie-saida)'}
              />
            )
          }
          detalhe={
            contratado === 0 ? (
              'Sem valor contratado para calcular a meta.'
            ) : custo > contratado ? (
              <span className="font-semibold text-aviso">
                Passou do contratado em <span className="numero">{formatarMoeda(custo - contratado)}</span>
              </span>
            ) : metaAtingida ? (
              <span className="font-semibold text-aviso">
                Meta atingida · limite <span className="numero">{formatarMoeda(metaCusto)}</span>
              </span>
            ) : (
              <>
                Faltam <span className="numero">{formatarMoeda(metaCusto - custo)}</span> até{' '}
                <span className="numero">{formatarMoeda(metaCusto)}</span>
              </>
            )
          }
        />
        <Cartao
          className="sm:col-span-2 xl:col-span-1"
          destaque
          rotulo="Saldo em caixa"
          valor={<Saldo valor={r?.saldo_caixa} />}
          detalhe={
            <>
              Contrato − custo <span className="numero">{formatarMoeda(r?.margem_prevista)}</span>
              {contratado > 0 && ` (${formatarPorcento(num(r?.margem_prevista) / contratado)})`}
              <span className="mt-1 block">Custos futuros não estão descontados.</span>
            </>
          }
        />
      </section>

      {/* ---------- Gráficos ---------- */}
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Painel titulo="Fluxo mensal">
          <FluxoDaObra id={o.ID_Obra} />
        </Painel>
        <Painel titulo="Onde foi o dinheiro">
          <OndeFoiODinheiro id={o.ID_Obra} />
        </Painel>
      </div>

      {/* ---------- Extrato ---------- */}
      <Extrato id={o.ID_Obra} />

      <FormObra
        key={p.painel.modo}
        estado={p.painel}
        aoFechar={p.fechar}
        aoExcluir={permissao.excluir ? p.pedirExclusao : undefined}
      />

      <ConfirmarExclusao
        aberto={p.excluindo !== null}
        aoFechar={p.cancelarExclusao}
        titulo="Excluir obra?"
        texto={
          <>
            <strong>{o.Nome_Obra}</strong> será apagada de vez. Se já houver lançamentos nela, o
            sistema não deixa excluir — mude o status para <strong>Cancelada</strong>.
          </>
        }
        aoConfirmar={async () => {
          try {
            await excluir.mutateAsync(o.ID_Obra)
            toast.success('Obra excluída.')
            navigate('/obras', { replace: true })
            return true
          } catch (e) {
            toast.error(mensagemDeErro(e))
            return false
          }
        }}
      />
    </div>
  )
}

/* ---------------- Peças ---------------- */

function AtalhoLancar({
  para,
  obra,
  icone: Icone,
  children,
}: {
  para: string
  obra: string
  icone: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  children: React.ReactNode
}) {
  return (
    <Link
      to={`${para}?novo=1&obra=${encodeURIComponent(obra)}`}
      className={buttonVariants({ variant: 'secondary', className: 'shrink-0' })}
    >
      <Icone aria-hidden={true} />
      <span>
        <span className="sr-only">Lançar </span>
        {children}
      </span>
    </Link>
  )
}

function Cartao({
  rotulo,
  valor,
  detalhe,
  trena,
  destaque,
  className,
}: {
  rotulo: string
  valor: React.ReactNode
  detalhe: React.ReactNode
  trena?: React.ReactNode
  destaque?: boolean
  className?: string
}) {
  return (
    <article
      className={cn(
        '@container flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5',
        destaque && 'border-transparent bg-marca text-white dark:bg-card dark:ring-1 dark:ring-ring/40',
        className,
      )}
    >
      <h2
        className={cn(
          'text-xs font-semibold tracking-wider text-muted-foreground uppercase',
          destaque && 'text-dourado',
        )}
      >
        {rotulo}
      </h2>
      <p
        className={cn(
          // tamanho acompanha a largura do cartão: o valor nunca vaza pela direita
          'display text-[clamp(1rem,8cqi,1.875rem)] leading-none font-bold',
          destaque && '[&_.text-negativo]:text-red-300 [&_.text-positivo]:text-green-300',
        )}
      >
        {valor}
      </p>
      {trena}
      <p className={cn('text-sm text-muted-foreground', destaque && 'text-white/75 dark:text-muted-foreground')}>
        {detalhe}
      </p>
    </article>
  )
}

function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="grid content-start gap-4 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {children}
    </section>
  )
}

function FluxoDaObra({ id }: { id: string }) {
  const fluxo = useFluxoObra(id)
  if (fluxo.isPending) return <Skeleton className="h-56 rounded-lg" />
  if (fluxo.isError) return <ListaErro erro={fluxo.error} aoTentar={() => void fluxo.refetch()} />
  if (fluxo.data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Ainda não há lançamentos nesta obra.</p>
  }
  return <GraficoFluxo pontos={fluxo.data} />
}

/** Custo por categoria (saídas) + mão de obra, em barras horizontais. */
function OndeFoiODinheiro({ id }: { id: string }) {
  const { movimentos, carregando } = useExtratoObra(id)
  const linhas = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of movimentos) {
      // mesma regra da vw_resumo_obras: recebimentos e saídas fora do custo não entram
      if (m.tipo === 'recebimento' || m.foraDoCusto) continue
      mapa.set(m.categoria, (mapa.get(m.categoria) ?? 0) + m.valor)
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1])
  }, [movimentos])
  const total = linhas.reduce((s, [, v]) => s + v, 0)
  const maior = linhas[0]?.[1] ?? 0

  if (carregando) return <Skeleton className="h-56 rounded-lg" />
  if (linhas.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nenhum gasto lançado ainda.</p>
  }

  return (
    <ul className="grid gap-3">
      {linhas.map(([categoria, valor]) => (
        <li key={categoria} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{categoria}</span>
            <span className="shrink-0 text-muted-foreground">
              <span className="numero font-semibold text-foreground">{formatarMoeda(valor)}</span>{' '}
              <span className="numero">· {formatarPorcento(total ? valor / total : 0)}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full origin-left animate-[trena-encher_700ms_var(--ease-saida)_both] rounded-full bg-serie-saida"
              style={{ width: `${maior ? (valor / maior) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
      <li className="flex justify-between border-t pt-3 text-sm font-semibold">
        <span>Total de custos</span>
        <span className="numero">{formatarMoeda(total)}</span>
      </li>
    </ul>
  )
}

/* ---------------- Extrato ---------------- */

const FILTROS: readonly { valor: TipoMovimento | 'todos'; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Tudo' },
  { valor: 'recebimento', rotulo: 'Recebimentos' },
  { valor: 'saida', rotulo: 'Saídas' },
  { valor: 'mao_de_obra', rotulo: 'Mão de obra' },
]

const ICONE: Record<TipoMovimento, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  recebimento: ArrowDownToLine,
  saida: ArrowUpFromLine,
  mao_de_obra: Wallet,
}

const PAGINA = 30

function Extrato({ id }: { id: string }) {
  const { movimentos, carregando, erro, recarregar } = useExtratoObra(id)
  const [filtro, setFiltro] = useState<TipoMovimento | 'todos'>('todos')
  const [limite, setLimite] = useState(PAGINA)

  const filtrados = movimentos.filter((m) => filtro === 'todos' || m.tipo === filtro)
  const contar = (t: TipoMovimento | 'todos') =>
    t === 'todos' ? movimentos.length : movimentos.filter((m) => m.tipo === t).length

  return (
    <section aria-labelledby="titulo-extrato" className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-extrato" className="text-xl font-bold">
          Extrato da obra
        </h2>
        <div role="radiogroup" aria-label="Filtrar extrato" className="flex overflow-x-auto rounded-lg border bg-card p-1">
          {FILTROS.map((f) => {
            const ativo = f.valor === filtro
            return (
              <button
                key={f.valor}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => {
                  setFiltro(f.valor)
                  setLimite(PAGINA)
                }}
                className={cn(
                  'flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150',
                  'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  ativo ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.rotulo}
                <span className="numero text-xs opacity-75">{contar(f.valor)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {erro ? (
        <ListaErro erro={erro} aoTentar={recarregar} />
      ) : carregando ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhum lançamento {filtro === 'todos' ? 'nesta obra' : 'deste tipo'} ainda.
        </p>
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {filtrados.slice(0, limite).map((m) => (
              <LinhaExtrato key={`${m.tipo}-${m.id}`} m={m} />
            ))}
          </ul>
          {filtrados.length > limite && (
            <Button variant="outline" className="justify-self-center" onClick={() => setLimite((l) => l + PAGINA)}>
              Mostrar mais ({filtrados.length - limite} restantes)
            </Button>
          )}
        </>
      )}
    </section>
  )
}

function LinhaExtrato({ m }: { m: Movimento }) {
  const Icone = ICONE[m.tipo]
  const entrada = m.tipo === 'recebimento'
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-3">
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full',
          entrada ? 'bg-serie-entrada/15 text-serie-entrada' : 'bg-serie-saida/15 text-serie-saida',
        )}
      >
        <Icone className="size-4" aria-hidden={true} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{m.titulo}</span>
        <span className="block truncate text-sm text-muted-foreground">
          <span className="numero">{formatarData(m.data)}</span>
          {m.detalhe && ` · ${m.detalhe}`}
        </span>
      </span>
      <span className={cn('numero shrink-0 font-semibold whitespace-nowrap', entrada && 'text-positivo')}>
        {entrada ? '+' : '−'} {formatarMoeda(m.valor)}
        <span className="sr-only">{entrada ? ' (entrada)' : ' (saída)'}</span>
      </span>
    </li>
  )
}

function EsqueletoDetalhe() {
  return (
    <div className="grid gap-8" role="status" aria-label="Carregando obra">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
