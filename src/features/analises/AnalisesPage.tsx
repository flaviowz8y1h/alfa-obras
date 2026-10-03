import { addMonths, startOfMonth, startOfYear } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { CartaoIndicador, FaixaIndicadores } from '@/components/painel'
import { Moeda, Saldo } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GraficoFluxo } from '@/features/obras/GraficoFluxo'
import { cn } from '@/lib/utils'
import { mensagemDeErro } from '@/utils/erros'
import {
  formatarData,
  formatarMoeda,
  formatarPorcento,
  hojeISO,
  num,
  paraISO,
} from '@/utils/format'
import { useMovimentosAnalise, usePosicaoAnalise } from './api'
import {
  calcularAnalise,
  periodoValido,
  somarValores,
  type FiltrosAnalise,
  type MovimentoAnalise,
} from './calculos'

type Detalhe = {
  escopo: string
  titulo: string
  tipo: 'categoria' | 'trabalhador' | 'obra' | 'equipe' | 'outras'
  id: string
}
const SEM_OBRA = 'geral'
const seletor =
  'bg-background border-input focus-visible:outline-ring h-11 w-full min-w-0 rounded-lg border px-3 text-sm focus-visible:outline-2'

function periodoInicial(): FiltrosAnalise {
  return { inicio: paraISO(startOfMonth(addMonths(new Date(), -5))), fim: hojeISO(), obra: '' }
}

export function AnalisesPage() {
  const [filtros, setFiltros] = useState(periodoInicial)
  const [rascunho, setRascunho] = useState(filtros)
  const [erroFiltro, setErroFiltro] = useState('')
  const [visao, setVisao] = useState<'saida' | 'mao_de_obra'>('saida')
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
  const painelDetalhe = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (detalhe) {
      painelDetalhe.current?.focus({ preventScroll: true })
      painelDetalhe.current?.scrollIntoView({ block: 'start' })
    }
  }, [detalhe])
  const movimentos = useMovimentosAnalise(filtros)
  const posicao = usePosicaoAnalise()
  const analise = useMemo(
    () => calcularAnalise(movimentos.data ?? [], filtros),
    [movimentos.data, filtros],
  )
  const obras = posicao.data ?? []
  const escopo = JSON.stringify(filtros)
  const grupos = visao === 'saida' ? analise.categorias : analise.trabalhadores
  const totalGrupo = visao === 'saida' ? analise.saidas : analise.equipe
  const categoriasVisiveis = analise.categorias.slice(0, 5)
  const outrasIds = new Set(analise.categorias.slice(5).map((g) => g.id))
  const composicao = [
    ...categoriasVisiveis.map((g) => ({ ...g, tipo: 'categoria' as const })),
    ...(outrasIds.size
      ? [
          {
            id: 'outras',
            nome: 'Outras categorias',
            valor: analise.categorias.slice(5).reduce((s, g) => s + g.valor, 0),
            tipo: 'outras' as const,
          },
        ]
      : []),
    ...(analise.equipe
      ? [{ id: 'equipe', nome: 'Mão de obra', valor: analise.equipe, tipo: 'equipe' as const }]
      : []),
  ].sort((a, b) => b.valor - a.valor)
  const maior = Math.max(1, ...composicao.map((g) => g.valor))
  const receber =
    obras
      .filter((o) => !filtros.obra || o.ID_Obra === filtros.obra)
      .reduce((s, o) => s + Math.round(num(o.a_receber) * 100), 0) / 100
  const comparacao = new Map(
    obras
      .filter((o) => !filtros.obra || o.ID_Obra === filtros.obra)
      .map((o) => [
        o.ID_Obra!,
        {
          id: o.ID_Obra!,
          nome: o.Nome_Obra ?? 'Obra sem nome',
          receber: num(o.a_receber),
          itens: [] as MovimentoAnalise[],
        },
      ]),
  )
  for (const m of analise.itens) {
    const id = m.obraId ?? SEM_OBRA
    const linha = comparacao.get(id) ?? { id, nome: m.obra, receber: NaN, itens: [] }
    linha.itens.push(m)
    comparacao.set(id, linha)
  }
  const itensDetalhe =
    detalhe?.escopo === escopo
      ? analise.itens.filter((m) => {
          switch (detalhe.tipo) {
            case 'categoria':
              return m.tipo === 'saida' && m.grupoId === detalhe.id
            case 'trabalhador':
              return m.tipo === 'mao_de_obra' && m.grupoId === detalhe.id
            case 'equipe':
              return m.tipo === 'mao_de_obra'
            case 'outras':
              return m.tipo === 'saida' && outrasIds.has(m.grupoId)
            case 'obra':
              return (m.obraId ?? SEM_OBRA) === detalhe.id
          }
        })
      : []

  function aplicar(e: FormEvent) {
    e.preventDefault()
    if (!periodoValido(rascunho))
      return setErroFiltro('Informe datas válidas; o início deve ser anterior ou igual ao fim.')
    setErroFiltro('')
    setFiltros({ ...rascunho })
    setDetalhe(null)
  }
  function atalho(inicio: Date) {
    const novo = { ...rascunho, inicio: paraISO(inicio), fim: hojeISO() }
    setRascunho(novo)
    setFiltros(novo)
    setErroFiltro('')
    setDetalhe(null)
  }
  function abrir(tipo: Detalhe['tipo'], id: string, titulo: string) {
    setDetalhe({ escopo, tipo, id, titulo })
  }

  return (
    <div className="grid min-w-0 gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Análises</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Uma visão dos resultados para decidir os próximos passos.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={movimentos.isFetching || posicao.isFetching}
          onClick={() => {
            void movimentos.refetch()
            void posicao.refetch()
          }}
        >
          <RefreshCw aria-hidden="true" />
          Atualizar
        </Button>
      </header>

      <section aria-label="Filtros da análise" className="bg-card rounded-2xl border p-4 sm:p-5">
        <form
          onSubmit={aplicar}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr_auto]"
        >
          <label className="grid min-w-0 gap-2 text-sm font-medium">
            De
            <Input
              type="date"
              className="dark:[color-scheme:dark]"
              required
              value={rascunho.inicio}
              onChange={(e) => setRascunho({ ...rascunho, inicio: e.target.value })}
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium">
            Até
            <Input
              type="date"
              className="dark:[color-scheme:dark]"
              required
              value={rascunho.fim}
              onChange={(e) => setRascunho({ ...rascunho, fim: e.target.value })}
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium">
            Obra
            <select
              className={seletor}
              value={rascunho.obra}
              onChange={(e) => setRascunho({ ...rascunho, obra: e.target.value })}
            >
              <option value="">Todas as obras + geral da empresa</option>
              <option value={SEM_OBRA}>Geral da empresa (sem obra)</option>
              {obras.map((o) => (
                <option key={o.ID_Obra} value={o.ID_Obra ?? ''}>
                  {o.Nome_Obra ?? 'Obra sem nome'}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" className="self-end">
            Aplicar filtros
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => atalho(startOfMonth(new Date()))}>
            Este mês
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => atalho(startOfMonth(addMonths(new Date(), -5)))}
          >
            Últimos 6 meses
          </Button>
          <Button size="sm" variant="ghost" onClick={() => atalho(startOfYear(new Date()))}>
            Este ano
          </Button>
        </div>
        {erroFiltro && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {erroFiltro}
          </p>
        )}
        <p className="text-muted-foreground mt-3 text-xs">
          Período aplicado: {formatarData(filtros.inicio)} a {formatarData(filtros.fim)} ·{' '}
          {filtros.obra === SEM_OBRA
            ? 'Geral da empresa'
            : filtros.obra
              ? (obras.find((o) => o.ID_Obra === filtros.obra)?.Nome_Obra ?? 'Obra selecionada')
              : 'Todas as obras + geral da empresa'}
          . Valores pela data do recebimento ou pagamento, incluindo as datas inicial e final.
        </p>
      </section>

      {posicao.isError && (
        <p role="alert" className="text-destructive rounded-xl border p-4 text-sm">
          Não foi possível carregar as obras e os valores a receber: {mensagemDeErro(posicao.error)}
        </p>
      )}
      {movimentos.isPending ? (
        <Skeleton className="h-72 rounded-2xl" aria-label="Carregando análise" />
      ) : movimentos.isError ? (
        <section role="alert" className="bg-card rounded-2xl border p-5">
          <p>Não foi possível carregar a análise: {mensagemDeErro(movimentos.error)}</p>
          <Button variant="outline" className="mt-3" onClick={() => void movimentos.refetch()}>
            Tentar novamente
          </Button>
        </section>
      ) : (
        <>
          <FaixaIndicadores rotulo="Indicadores da análise">
            <CartaoIndicador
              destaque
              rotulo="Recebido no período"
              valor={<Moeda valor={analise.recebido} />}
              detalhe="Pagamentos recebidos dos clientes"
              icone={ArrowDownLeft}
            />
            <CartaoIndicador
              rotulo="Gastos no período"
              valor={<Moeda valor={analise.gasto} />}
              detalhe={`Saídas ${formatarMoeda(analise.saidas)} · Equipe ${formatarMoeda(analise.equipe)}`}
              indice={1}
              icone={ArrowUpRight}
            />
            <CartaoIndicador
              rotulo="Resultado do período"
              valor={<Saldo valor={analise.resultado} />}
              detalhe="Recebimentos menos saídas e pagamentos à equipe"
              indice={2}
            />
            <CartaoIndicador
              rotulo="A receber atual"
              valor={
                posicao.isPending ? (
                  '…'
                ) : posicao.isError ? (
                  'Indisponível'
                ) : (
                  <Moeda valor={receber} />
                )
              }
              detalhe="Posição atual das obras selecionadas; independe do período"
              indice={3}
            />
          </FaixaIndicadores>
          {analise.itens.length === 0 && (
            <p role="status" className="bg-muted/40 rounded-xl border border-dashed p-4 text-sm">
              Nenhum lançamento no período e obra selecionados. Experimente outro período; o valor a
              receber continua mostrando a posição atual.
            </p>
          )}

          <div className="grid min-w-0 gap-5 xl:grid-cols-[1.5fr_1fr]">
            <Painel
              titulo="Evolução financeira"
              descricao="Recebimentos e gastos por mês dentro do período escolhido."
            >
              <div className="overflow-x-auto">
                <div style={{ minWidth: Math.max(0, analise.meses.length * 56) }}>
                  <GraficoFluxo
                    key={escopo}
                    pontos={analise.meses}
                    maxMeses={analise.meses.length}
                  />
                </div>
              </div>
            </Painel>
            <Painel
              titulo="Distribuição dos gastos"
              descricao="Saídas por categoria e pagamentos à equipe. Clique para ver os lançamentos."
            >
              {composicao.length === 0 ? (
                <Vazio texto="Nenhum gasto neste período." />
              ) : (
                <ul className="grid gap-3">
                  {composicao.map((g) => (
                    <li key={`${g.tipo}-${g.id}`}>
                      <button
                        type="button"
                        onClick={() => abrir(g.tipo, g.id, g.nome)}
                        className="focus-visible:outline-ring hover:bg-muted/40 grid w-full min-w-0 cursor-pointer gap-2 rounded-lg p-2 text-left focus-visible:outline-2"
                      >
                        <span className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                          <span className="min-w-0 font-medium break-words">{g.nome}</span>
                          <span className="numero whitespace-nowrap">
                            {formatarMoeda(g.valor)}{' '}
                            <span className="text-muted-foreground text-xs">
                              · {formatarPorcento(analise.gasto ? g.valor / analise.gasto : 0)}
                            </span>
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="bg-muted h-2 overflow-hidden rounded-full"
                        >
                          <span
                            className={cn(
                              'block h-full rounded-full',
                              g.tipo === 'equipe' ? 'bg-serie-entrada' : 'bg-serie-saida',
                            )}
                            style={{ width: `${Math.max(0, (g.valor / maior) * 100)}%` }}
                          />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Painel>
          </div>

          <Painel
            titulo="Detalhamento dos gastos"
            descricao="Categorias mostram as saídas; Equipe mostra os pagamentos por trabalhador pela data do pagamento, que pode diferir dos dias trabalhados."
          >
            <div role="group" aria-label="Visão dos gastos" className="mb-4 flex flex-wrap gap-2">
              <Button
                variant={visao === 'saida' ? 'default' : 'outline'}
                aria-pressed={visao === 'saida'}
                onClick={() => setVisao('saida')}
              >
                Categorias
              </Button>
              <Button
                variant={visao === 'mao_de_obra' ? 'default' : 'outline'}
                aria-pressed={visao === 'mao_de_obra'}
                onClick={() => setVisao('mao_de_obra')}
              >
                Equipe
              </Button>
            </div>
            {grupos.length === 0 ? (
              <Vazio
                texto={
                  visao === 'saida'
                    ? 'Nenhuma saída neste período.'
                    : 'Nenhum pagamento à equipe neste período.'
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{visao === 'saida' ? 'Categoria' : 'Trabalhador'}</TableHead>
                    <TableHead className="text-right">Lançamentos</TableHead>
                    <TableHead className="text-right">Total pago</TableHead>
                    <TableHead className="text-right">Participação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="text-primary dark:text-ring cursor-pointer rounded text-left font-semibold underline-offset-4 hover:underline focus-visible:outline-2"
                          onClick={() =>
                            abrir(visao === 'saida' ? 'categoria' : 'trabalhador', g.id, g.nome)
                          }
                        >
                          {g.nome}
                        </button>
                      </TableCell>
                      <TableCell className="numero text-right">{g.quantidade}</TableCell>
                      <TableCell className="numero text-right">{formatarMoeda(g.valor)}</TableCell>
                      <TableCell className="numero text-right">
                        {formatarPorcento(totalGrupo ? g.valor / totalGrupo : 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Painel>

          {detalhe?.escopo === escopo && (
            <div
              ref={painelDetalhe}
              tabIndex={-1}
              className="scroll-mt-20 rounded-2xl focus-visible:outline-2"
            >
              <Painel
                titulo={`Lançamentos · ${detalhe.titulo}`}
                descricao={`${itensDetalhe.length} lançamento(s) no período aplicado. Recebimentos ${formatarMoeda(somarValores(itensDetalhe.filter((m) => m.tipo === 'recebimento')))} · Gastos ${formatarMoeda(somarValores(itensDetalhe.filter((m) => m.tipo !== 'recebimento')))}.`}
              >
                <Button variant="ghost" size="sm" className="mb-3" onClick={() => setDetalhe(null)}>
                  <X aria-hidden="true" />
                  Fechar detalhes
                </Button>
                <ListaMovimentos key={`${detalhe.tipo}-${detalhe.id}`} itens={itensDetalhe} />
              </Painel>
            </div>
          )}

          <Painel
            titulo="Comparação entre obras"
            descricao="Recebido, gastos e resultado correspondem ao período. A receber mostra a posição atual. Geral da empresa fica em uma linha separada."
          >
            {comparacao.size === 0 ? (
              <Vazio texto="Nenhuma obra ou lançamento disponível para comparar." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obra</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                    <TableHead className="text-right">A receber atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...comparacao.values()]
                    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                    .map((o) => {
                      const entrada = somarValores(o.itens.filter((m) => m.tipo === 'recebimento'))
                      const gasto = somarValores(o.itens.filter((m) => m.tipo !== 'recebimento'))
                      return (
                        <TableRow key={o.id}>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => abrir('obra', o.id, o.nome)}
                              className="text-primary dark:text-ring cursor-pointer rounded text-left font-semibold hover:underline focus-visible:outline-2"
                            >
                              {o.nome}
                            </button>
                            {o.id !== SEM_OBRA && (
                              <Link
                                to={`/obras/${o.id}`}
                                className="text-muted-foreground mt-1 block text-xs hover:underline"
                              >
                                Abrir obra ↗
                              </Link>
                            )}
                          </TableCell>
                          <TableCell className="numero text-right">
                            {formatarMoeda(entrada)}
                          </TableCell>
                          <TableCell className="numero text-right">
                            {formatarMoeda(gasto)}
                          </TableCell>
                          <TableCell className="numero text-right">
                            <Saldo
                              valor={Math.round((entrada - gasto) * 100) / 100}
                              comIcone={false}
                            />
                          </TableCell>
                          <TableCell className="numero text-right">
                            {o.id === SEM_OBRA
                              ? '—'
                              : posicao.isPending
                                ? '…'
                                : posicao.isError
                                  ? 'Indisponível'
                                  : Number.isFinite(o.receber)
                                    ? formatarMoeda(o.receber)
                                    : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            )}
          </Painel>
        </>
      )}
    </div>
  )
}

function Painel({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao: string
  children: ReactNode
}) {
  return (
    <section aria-label={titulo} className="bg-card min-w-0 rounded-2xl border p-4 sm:p-6">
      <h2 className="text-xl font-bold">{titulo}</h2>
      <p className="text-muted-foreground mt-2 mb-5 text-sm">{descricao}</p>
      {children}
    </section>
  )
}
function Vazio({ texto }: { texto: string }) {
  return (
    <p className="text-muted-foreground py-6 text-center text-sm">
      <ChartNoAxesCombined aria-hidden="true" className="mx-auto mb-2 size-6" />
      {texto}
    </p>
  )
}
function ListaMovimentos({ itens }: { itens: readonly MovimentoAnalise[] }) {
  const [limite, setLimite] = useState(30)
  if (!itens.length) return <Vazio texto="Nenhum lançamento para este grupo no período." />
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Obra</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.slice(0, limite).map((m) => (
            <TableRow key={`${m.tipo}-${m.id}`}>
              <TableCell>{formatarData(m.data)}</TableCell>
              <TableCell>
                <span className="font-medium">{m.grupo}</span>
                <span className="text-muted-foreground block text-xs">{m.descricao}</span>
              </TableCell>
              <TableCell>{m.obra}</TableCell>
              <TableCell className="numero text-right">
                <span className={m.tipo === 'recebimento' ? 'text-positivo' : 'text-negativo'}>
                  {m.tipo === 'recebimento' ? '+' : '−'} {formatarMoeda(m.valor)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {itens.length > limite && (
        <Button variant="outline" className="mt-4" onClick={() => setLimite(limite + 30)}>
          Mostrar mais ({itens.length - limite} restantes)
        </Button>
      )}
    </>
  )
}
