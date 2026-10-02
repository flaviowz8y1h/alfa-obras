import { CircleAlert, Clock, Info, type LucideIcon, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Trena } from '@/components/valores'
import { cn } from '@/lib/utils'
import { formatarMoeda, formatarPorcento } from '@/utils/format'

/** A partir desta fração do contratado, o custo da obra vira alerta. */
export const CUSTO_ALTO = 0.8

/* ---------------- Indicadores ---------------- */

export function FaixaIndicadores({
  rotulo,
  className,
  children,
}: {
  rotulo: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={rotulo} className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {children}
    </section>
  )
}

/**
 * Cartão de indicador. `destaque` pinta de marinho (o número principal da tela);
 * no escuro vira um card com anel, como o resto da interface.
 */
export function CartaoIndicador({
  rotulo,
  valor,
  detalhe,
  children,
  destaque = false,
  grande = false,
  icone: Icone,
  className,
  indice = 0,
}: {
  rotulo: string
  valor: React.ReactNode
  detalhe?: React.ReactNode
  /** Conteúdo entre o valor e o detalhe (ex.: uma trena). */
  children?: React.ReactNode
  destaque?: boolean
  grande?: boolean
  icone?: LucideIcon
  className?: string
  /** Posição na faixa, para escalonar a animação de entrada. */
  indice?: number
}) {
  return (
    <article
      style={{ animationDelay: `${indice * 50}ms` }}
      className={cn(
        '@container flex min-w-0 animate-entrar flex-col gap-3 rounded-xl border bg-card p-5',
        destaque &&
          'border-transparent bg-marca text-white dark:bg-card dark:ring-1 dark:ring-ring/40 [&_.text-negativo]:text-red-300 [&_.text-positivo]:text-green-300 dark:[&_.text-negativo]:text-negativo dark:[&_.text-positivo]:text-positivo',
        className,
      )}
    >
      <h2
        className={cn(
          'flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase',
          destaque && 'text-dourado',
        )}
      >
        {Icone && <Icone className="size-4" aria-hidden="true" />}
        {rotulo}
      </h2>
      <p
        className={cn(
          'display numero leading-none font-bold',
          // tamanho acompanha a largura do cartão: o valor nunca vaza pela direita
          grande ? 'text-[clamp(1.25rem,8cqi,2.75rem)] font-extrabold' : 'text-[clamp(1rem,8cqi,1.875rem)]',
        )}
      >
        {valor}
      </p>
      {children}
      {detalhe && (
        <p
          className={cn(
            'mt-auto text-sm text-muted-foreground',
            destaque && 'text-white/75 dark:text-muted-foreground',
          )}
        >
          {detalhe}
        </p>
      )}
    </article>
  )
}

/* ---------------- Trena dupla: recebido e custo contra o contratado ---------------- */

export function TrenaDupla({
  contratado,
  recebido,
  custo,
  nome,
  compacta = false,
  className,
}: {
  contratado: number
  recebido: number
  custo: number
  nome: string
  /** Versão de tabela: rótulo curto à esquerda e porcentagem à direita. */
  compacta?: boolean
  className?: string
}) {
  const fr = contratado ? recebido / contratado : 0
  const fc = contratado ? custo / contratado : 0
  const alto = fc > CUSTO_ALTO
  const corCusto = alto ? 'var(--negativo)' : 'var(--serie-saida)'

  if (compacta) {
    return (
      <div className={cn('grid gap-1.5', className)}>
        <LinhaCompacta rotulo="Recebido" fracao={fr}>
          <Trena parte={recebido} total={contratado} rotulo={`Recebido da obra ${nome}`} cor="var(--serie-entrada)" className="h-1.5" />
        </LinhaCompacta>
        <LinhaCompacta rotulo="Custo" fracao={fc} alto={alto}>
          <Trena parte={custo} total={contratado} rotulo={`Custo da obra ${nome}`} cor={corCusto} className="h-1.5" />
        </LinhaCompacta>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <p className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Recebido</span>
        <span className="numero">
          <span className="font-semibold">{formatarMoeda(recebido)}</span> · {formatarPorcento(fr)}
        </span>
      </p>
      <Trena parte={recebido} total={contratado} rotulo={`Recebido da obra ${nome}`} cor="var(--serie-entrada)" />
      <p className="mt-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Custo</span>
        <span className={cn('numero', alto && 'text-negativo')}>
          <span className="font-semibold">{formatarMoeda(custo)}</span> · {formatarPorcento(fc)}
        </span>
      </p>
      <Trena parte={custo} total={contratado} rotulo={`Custo da obra ${nome}`} cor={corCusto} />
    </div>
  )
}

function LinhaCompacta({
  rotulo,
  fracao,
  alto = false,
  children,
}: {
  rotulo: string
  fracao: number
  alto?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{rotulo}</span>
      <div className="min-w-0 flex-1">{children}</div>
      <span className={cn('numero w-10 shrink-0 text-right text-xs font-semibold', alto && 'text-negativo')}>
        {formatarPorcento(fracao)}
      </span>
    </div>
  )
}

/* ---------------- Alertas ---------------- */

export type NivelAlerta = 'critico' | 'aviso' | 'info'

const ESTILO_ALERTA: Record<NivelAlerta, { icone: LucideIcon; caixa: string; cor: string; rotulo: string }> = {
  critico: { icone: TriangleAlert, caixa: 'bg-negativo-fundo', cor: 'text-negativo', rotulo: 'Crítico' },
  aviso: { icone: Clock, caixa: 'bg-aviso-fundo', cor: 'text-aviso', rotulo: 'Atenção' },
  info: { icone: Info, caixa: 'bg-accent', cor: 'text-accent-foreground', rotulo: 'Aviso' },
}

export function ItemAlerta({
  nivel,
  titulo,
  texto,
  acao,
}: {
  nivel: NivelAlerta
  titulo: string
  texto: React.ReactNode
  acao?: { para: string; rotulo: string }
}) {
  const e = ESTILO_ALERTA[nivel]
  const Icone = e.icone
  return (
    <li className="flex gap-3.5 border-t py-4 first:border-t-0 first:pt-0 last:pb-0">
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', e.caixa)}>
        <Icone className={cn('size-5', e.cor)} aria-hidden="true" />
        <span className="sr-only">{e.rotulo}:</span>
      </span>
      <div className="grid min-w-0 gap-1">
        <p className="font-semibold">{titulo}</p>
        <p className="text-sm text-muted-foreground">{texto}</p>
        {acao && (
          <Link
            to={acao.para}
            className="mt-0.5 w-fit rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:text-ring"
          >
            {acao.rotulo} →
          </Link>
        )}
      </div>
    </li>
  )
}

/** Quando não há nada a apontar. */
export function SemAlertas({ texto }: { texto: string }) {
  return (
    <p className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {texto}
    </p>
  )
}

/* ---------------- Seção com título ---------------- */

export function Painel({
  titulo,
  descricao,
  acao,
  className,
  corpoClassName,
  children,
  id,
}: {
  titulo: React.ReactNode
  descricao?: React.ReactNode
  acao?: React.ReactNode
  className?: string
  corpoClassName?: string
  children: React.ReactNode
  id?: string
}) {
  const idTitulo = id ?? undefined
  return (
    <section aria-labelledby={idTitulo} className={cn('flex min-w-0 flex-col rounded-xl border bg-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4">
        <div className="min-w-0">
          <h2 id={idTitulo} className="text-lg font-bold">
            {titulo}
          </h2>
          {descricao && <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className={cn('flex-1 px-5 pb-5', corpoClassName)}>{children}</div>
    </section>
  )
}
