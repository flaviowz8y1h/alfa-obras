import { addDays, eachDayOfInterval, getDay, parseISO, startOfWeek } from 'date-fns'
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CartaoIndicador, FaixaIndicadores } from '@/components/painel'
import { Moeda } from '@/components/valores'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePagamentosMaoDeObra } from '@/features/lancamentos/api'
import { usePermissao } from '@/hooks/use-permissao'
import { cn } from '@/lib/utils'
import type { Trabalhador } from '@/types/app'
import { mensagemDeErro } from '@/utils/erros'
import { formatarData, formatarMoeda, mesAtual, num, paraISO, rotuloDia } from '@/utils/format'
import { type PagamentoSemana, usePagamentosSemana } from './api'

/* ---------------- Vínculo ---------------- */

const COR_VINCULO: Record<string, string> = {
  Diarista: 'bg-accent text-accent-foreground',
  Empreiteiro: 'bg-serie-saida/12 text-foreground',
  CLT: 'bg-positivo/12 text-foreground',
}

export function SeloVinculo({ vinculo }: { vinculo: string | null }) {
  if (!vinculo) return null
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold whitespace-nowrap',
        COR_VINCULO[vinculo] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {vinculo}
    </span>
  )
}

/* ---------------- Cálculo da semana ---------------- */

const segundaDe = (d: Date) => paraISO(startOfWeek(d, { weekStartsOn: 1 }))

/** Dias de segunda a sábado de um período (domingo não conta, como no lançamento). */
function diasUteis(inicio: string, fim: string): number {
  const a = parseISO(inicio)
  const b = parseISO(fim)
  if (b < a) return 0
  return eachDayOfInterval({ start: a, end: b }).filter((d) => getDay(d) !== 0).length
}

type LinhaSemana = {
  trabalhador: Trabalhador
  dias: Set<string>
  valor: number
  obras: Set<string>
}

function montarSemana(
  dias: readonly string[],
  pagamentos: readonly PagamentoSemana[],
  trabalhadores: readonly Trabalhador[],
): LinhaSemana[] {
  const porId = new Map(trabalhadores.map((t) => [t.ID_Trabalhador, t]))
  const linhas = new Map<string, LinhaSemana>()
  const linha = (t: Trabalhador) => {
    const l = linhas.get(t.ID_Trabalhador) ?? { trabalhador: t, dias: new Set(), valor: 0, obras: new Set() }
    linhas.set(t.ID_Trabalhador, l)
    return l
  }

  for (const p of pagamentos) {
    const t = porId.get(p.ID_Trabalhador)
    if (!t) continue
    const l = linha(t)
    if (p.Nome_Obra) l.obras.add(p.Nome_Obra)
    if (!p.Periodo_Inicio || !p.Periodo_Fim) {
      // sem período: conta o valor na semana em que foi pago
      l.valor += num(p.Valor_Pago)
      continue
    }
    const { Periodo_Inicio: ini, Periodo_Fim: fim } = p
    const cobertos = dias.filter((d) => d >= ini && d <= fim)
    cobertos.forEach((d) => l.dias.add(d))
    // período maior que a semana: só a parte proporcional entra aqui
    const total = diasUteis(ini, fim)
    const proporcional = total ? (num(p.Valor_Pago) * cobertos.length) / total : 0
    l.valor +=
      p.Tipo_Pagamento === 'Diária' && p.Valor_Diaria_Aplicado
        ? Math.min(cobertos.length * num(p.Valor_Diaria_Aplicado), num(p.Valor_Pago))
        : proporcional
  }

  // diaristas ativos sem nada pago também aparecem: é justamente quem pode estar faltando
  for (const t of trabalhadores) {
    if ((t.Status ?? 'Ativo') === 'Ativo' && t.Tipo_Vinc_Contrato === 'Diarista') linha(t)
  }

  return [...linhas.values()].sort((a, b) =>
    (a.trabalhador.Nome_Trabalhador ?? '').localeCompare(b.trabalhador.Nome_Trabalhador ?? '', 'pt-BR'),
  )
}

/* ---------------- Painel ---------------- */

export function PainelEquipe({ trabalhadores }: { trabalhadores: readonly Trabalhador[] }) {
  const podeLancar = usePermissao('lancamentos').criar
  const semanaAtual = segundaDe(new Date())
  const [inicio, setInicio] = useState(semanaAtual)
  const dias = useMemo(
    () => Array.from({ length: 6 }, (_, i) => paraISO(addDays(parseISO(inicio), i))),
    [inicio],
  )
  const fim = dias[5]!
  const consulta = usePagamentosSemana(inicio, fim)
  const mes = usePagamentosMaoDeObra({ mes: mesAtual(), obra: '' })

  const linhas = useMemo(
    () => montarSemana(dias, consulta.data ?? [], trabalhadores),
    [dias, consulta.data, trabalhadores],
  )
  const pagoSemana = linhas.reduce((s, l) => s + l.valor, 0)
  const diasPagos = linhas.reduce((s, l) => s + l.dias.size, 0)
  const pessoasPagas = linhas.filter((l) => l.valor > 0).length
  const diaristasSemPagamento = linhas.filter(
    (l) => l.trabalhador.Tipo_Vinc_Contrato === 'Diarista' && l.valor === 0,
  ).length
  const pagoMes = (mes.data ?? []).reduce((s, p) => s + num(p.Valor_Pago), 0)

  const ativos = trabalhadores.filter((t) => (t.Status ?? 'Ativo') === 'Ativo')
  const porVinculo = [...ativos.reduce((m, t) => {
    const v = t.Tipo_Vinc_Contrato ?? 'Sem vínculo'
    return m.set(v, (m.get(v) ?? 0) + 1)
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .map(([v, n]) => `${n} ${v.toLowerCase()}`)
    .join(' · ')

  const titulo = `Semana de ${formatarData(inicio, 'd')} a ${formatarData(fim, "d 'de' MMMM")}`

  return (
    <div className="grid gap-6">
      <FaixaIndicadores rotulo="Resumo da equipe">
        <CartaoIndicador
          destaque
          rotulo={inicio === semanaAtual ? 'Pago nesta semana' : 'Pago na semana'}
          valor={<Moeda valor={pagoSemana} />}
          detalhe={`${pessoasPagas} ${pessoasPagas === 1 ? 'pessoa' : 'pessoas'} · ${diasPagos} ${diasPagos === 1 ? 'dia pago' : 'dias pagos'}`}
        />
        <CartaoIndicador
          indice={1}
          rotulo="Pago no mês"
          valor={mes.isPending ? '…' : formatarMoeda(pagoMes)}
          detalhe={`${mes.data?.length ?? 0} pagamento(s) de mão de obra`}
        />
        <CartaoIndicador
          indice={2}
          rotulo="Equipe ativa"
          valor={`${ativos.length} ${ativos.length === 1 ? 'pessoa' : 'pessoas'}`}
          detalhe={porVinculo || 'Ninguém ativo'}
        />
        <CartaoIndicador
          indice={3}
          rotulo="Diaristas sem dia pago"
          valor={<span className={cn(diaristasSemPagamento > 0 && 'text-aviso')}>{diaristasSemPagamento}</span>}
          detalhe="Diaristas ativos sem pagamento que cubra a semana"
        />
      </FaixaIndicadores>

      <section aria-labelledby="titulo-semana" className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setInicio(paraISO(addDays(parseISO(inicio), -7)))} aria-label="Semana anterior">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <h2 id="titulo-semana" className="min-w-0 px-1 text-lg font-bold" aria-live="polite">
              {titulo}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setInicio(paraISO(addDays(parseISO(inicio), 7)))}
              disabled={inicio >= semanaAtual}
              aria-label="Próxima semana"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            {inicio !== semanaAtual && (
              <Button variant="link" size="sm" onClick={() => setInicio(semanaAtual)}>
                Esta semana
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ul className="flex gap-4 text-xs text-muted-foreground" aria-label="Legenda">
              <li className="flex items-center gap-1.5">
                <Celula paga />
                Dia pago
              </li>
              <li className="flex items-center gap-1.5">
                <Celula paga={false} />
                Sem pagamento
              </li>
            </ul>
            {podeLancar && (
              <Link to="/lancamentos/mao-de-obra?novo=1" className={buttonVariants({ size: 'sm' })}>
                <Plus aria-hidden="true" />
                Lançar pagamento
              </Link>
            )}
          </div>
        </div>

        {consulta.isPending ? (
          <div className="grid gap-2 px-5 pb-5" role="status" aria-label="Carregando a semana">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : consulta.isError ? (
          <p className="px-5 pb-5 text-sm text-destructive">{mensagemDeErro(consulta.error)}</p>
        ) : linhas.length === 0 ? (
          <p className="border-t px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhum pagamento de mão de obra nesta semana.
          </p>
        ) : (
          <>
            {/* Celular: um cartão por pessoa */}
            <ul className="grid gap-3 border-t bg-muted/30 p-3 md:hidden">
              {linhas.map((l) => (
                <li key={l.trabalhador.ID_Trabalhador} className="grid gap-3 rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Pessoa l={l} />
                    <SeloVinculo vinculo={l.trabalhador.Tipo_Vinc_Contrato} />
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {dias.map((d) => (
                      <div key={d} className="grid justify-items-center gap-1">
                        <span className="text-[0.6875rem] font-semibold text-muted-foreground uppercase">
                          {rotuloDia(d).semana}
                        </span>
                        <Celula paga={l.dias.has(d)} dia={d} />
                      </div>
                    ))}
                  </div>
                  <p className="flex items-baseline justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">
                      <span className="numero">{l.dias.size}</span> {l.dias.size === 1 ? 'dia pago' : 'dias pagos'}
                    </span>
                    <Moeda valor={l.valor} className="text-base font-bold" />
                  </p>
                </li>
              ))}
            </ul>

            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-t bg-muted/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th scope="col" className="py-2.5 pr-3 pl-5 text-left font-semibold">Trabalhador</th>
                    <th scope="col" className="px-3 py-2.5 text-left font-semibold">Vínculo</th>
                    {dias.map((d) => (
                      <th key={d} scope="col" className="w-10 px-1 py-2.5 text-center font-semibold">
                        {rotuloDia(d).semana}
                        <span className="numero block font-normal normal-case">{rotuloDia(d).numero}</span>
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Dias</th>
                    <th scope="col" className="py-2.5 pr-5 pl-3 text-right font-semibold">Pago na semana</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-t">
                  {linhas.map((l) => (
                    <tr key={l.trabalhador.ID_Trabalhador}>
                      <td className="py-3 pr-3 pl-5">
                        <Pessoa l={l} />
                      </td>
                      <td className="px-3 py-3">
                        <SeloVinculo vinculo={l.trabalhador.Tipo_Vinc_Contrato} />
                      </td>
                      {dias.map((d) => (
                        <td key={d} className="px-1 py-3">
                          <div className="flex justify-center">
                            <Celula paga={l.dias.has(d)} dia={d} />
                          </div>
                        </td>
                      ))}
                      <td className="numero px-3 py-3 text-right">{l.dias.size || '—'}</td>
                      <td className="py-3 pr-5 pl-3 text-right font-semibold">
                        {l.valor > 0 ? <Moeda valor={l.valor} /> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/40 font-semibold">
                  <tr>
                    <td className="py-3 pl-5" colSpan={2 + dias.length}>
                      Total da semana
                    </td>
                    <td className="numero px-3 py-3 text-right">{diasPagos}</td>
                    <td className="py-3 pr-5 pl-3 text-right">
                      <Moeda valor={pagoSemana} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Pessoa({ l }: { l: LinhaSemana }) {
  const t = l.trabalhador
  const iniciais = (t.Nome_Trabalhador ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-heading text-sm font-bold text-secondary-foreground">
        {iniciais}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold">{t.Nome_Trabalhador ?? 'Sem nome'}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[t.Funcao, [...l.obras].join(', ')].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
    </div>
  )
}

function Celula({ paga, dia }: { paga: boolean; dia?: string }) {
  const rotulo = dia ? `${formatarData(dia, "EEEE, d 'de' MMMM")}: ${paga ? 'dia pago' : 'sem pagamento'}` : undefined
  return paga ? (
    <span
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground"
    >
      <Check className="size-4" strokeWidth={3} aria-hidden="true" />
    </span>
  ) : (
    <span
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      className="size-7 rounded-md border-[1.5px] border-dashed border-input"
    />
  )
}
