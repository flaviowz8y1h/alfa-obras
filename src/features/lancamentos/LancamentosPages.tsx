import { ChevronRight, Paperclip, Plus, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BarraFiltros, ListaCarregando, ListaErro, ListaVazia } from '@/components/cadastro'
import { CartaoIndicador, FaixaIndicadores } from '@/components/painel'
import { Saldo } from '@/components/valores'
import { usePermissao } from '@/hooks/use-permissao'
import { cn } from '@/lib/utils'
import { formatarData, formatarMoeda, formatarNumero, nomeDoMes, num } from '@/utils/format'
import { contem } from '@/utils/texto'
import { usePagamentosMaoDeObra, useRecebimentos, useSaidas } from './api'
import { FiltrosLancamento } from './comum'
import { useFiltrosLancamento } from './hooks'
import { IconeTipo } from './IconeTipo'
import { TIPO_LANCAMENTO, type TipoLancamento } from './tipos'

const NOVO: Record<TipoLancamento, { rotulo: string; descricao: string }> = {
  saida: { rotulo: 'Nova saída', descricao: 'Material, ferramenta, frete…' },
  recebimento: { rotulo: 'Novo recebimento', descricao: 'Pagamento do cliente' },
  mao_de_obra: { rotulo: 'Novo pagamento', descricao: 'Diária, empreitada, adiantamento' },
}
const ORDEM: readonly TipoLancamento[] = ['saida', 'recebimento', 'mao_de_obra']

type Linha = {
  id: string
  tipo: TipoLancamento
  data: string | null
  titulo: string
  detalhe: string
  /** Positivo = entrou; negativo = saiu. */
  valor: number
  /** Só saídas têm comprovante; undefined = não se aplica. */
  anexo?: boolean
}

type FiltroTipo = 'todos' | TipoLancamento

/** Extrato do mês: saídas, recebimentos e mão de obra numa lista só. */
export function LancamentosPage() {
  const filtros = useFiltrosLancamento()
  const saidas = useSaidas(filtros)
  const recebimentos = useRecebimentos(filtros)
  const maoDeObra = usePagamentosMaoDeObra(filtros)
  const podeCriar = usePermissao('lancamentos').criar
  const [tipo, setTipo] = useState<FiltroTipo>('todos')
  const [busca, setBusca] = useState('')

  const consultas = [saidas, recebimentos, maoDeObra]
  const carregando = consultas.some((c) => c.isPending)
  const erro = consultas.find((c) => c.isError)

  const linhas = useMemo<Linha[]>(() => {
    const s: Linha[] = (saidas.data ?? []).map((x) => ({
      id: x.ID_Saida,
      tipo: 'saida',
      data: x.Data_Saida,
      titulo: x.Descricao || x.Nome_Categoria || 'Saída',
      detalhe: [x.Nome_Obra ?? 'Geral da empresa', x.Descricao ? x.Nome_Categoria : null, x.Fornecedor_Local, x.Forma_Pagamento]
        .filter(Boolean)
        .join(' · '),
      valor: -num(x.Valor),
      anexo: !!x.Comprovante_URL,
    }))
    const r: Linha[] = (recebimentos.data ?? []).map((x) => ({
      id: x.ID_Recebimento,
      tipo: 'recebimento',
      data: x.Data_Recebimento,
      titulo: x.Observacao || 'Recebimento do cliente',
      detalhe: [x.Nome_Obra, x.Nome_Cliente, x.Forma_Pagamento].filter(Boolean).join(' · '),
      valor: num(x.Valor_Recebido),
    }))
    const m: Linha[] = (maoDeObra.data ?? []).map((x) => ({
      id: x.ID_Pagamento,
      tipo: 'mao_de_obra',
      data: x.Data_Pagamento,
      titulo: x.Nome_Trabalhador ?? 'Mão de obra',
      detalhe: [
        x.Nome_Obra,
        x.Tipo_Pagamento === 'Diária' && x.Quantidade_Dias != null
          ? `${formatarNumero(x.Quantidade_Dias)} dia(s) × ${formatarMoeda(x.Valor_Diaria_Aplicado)}`
          : x.Tipo_Pagamento,
        x.Forma_Pagamento,
      ]
        .filter(Boolean)
        .join(' · '),
      valor: -num(x.Valor_Pago),
    }))
    return [...s, ...r, ...m].sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))
  }, [saidas.data, recebimentos.data, maoDeObra.data])

  const soma = (t: TipoLancamento) => linhas.filter((l) => l.tipo === t).reduce((s, l) => s + l.valor, 0)
  const conta = (t: TipoLancamento) => linhas.filter((l) => l.tipo === t).length
  const entradas = soma('recebimento')
  const resultado = linhas.reduce((s, l) => s + l.valor, 0)
  const semComprovante = linhas.filter((l) => l.anexo === false).length

  const visiveis = linhas.filter(
    (l) => (tipo === 'todos' || l.tipo === tipo) && contem(busca, l.titulo, l.detalhe),
  )

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Lançamentos</h1>
        <p className="mt-1 text-muted-foreground">Saídas, recebimentos e mão de obra num só extrato.</p>
      </header>

      {/* @container: o layout em linha depende da largura do próprio bloco, não da tela —
          com a barra lateral ou em tablet, 3 cartões em linha ficavam espremidos. */}
      {podeCriar && (
        <nav aria-label="Novo lançamento" className="@container grid grid-cols-3 gap-2 sm:gap-3">
          {ORDEM.map((t) => (
            <Link
              key={t}
              to={`${TIPO_LANCAMENTO[t].para}?novo=1`}
              className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border bg-card p-3 text-center transition-colors duration-150 hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-4 @4xl:flex-row @4xl:justify-start @4xl:gap-4 @4xl:text-left"
            >
              <IconeTipo tipo={t} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-tight font-semibold sm:text-base">{NOVO[t].rotulo}</span>
                <span className="hidden text-sm text-muted-foreground sm:block">{NOVO[t].descricao}</span>
              </span>
              <Plus
                className="hidden size-5 text-muted-foreground transition-transform duration-150 group-hover:rotate-90 @4xl:block"
                aria-hidden="true"
              />
            </Link>
          ))}
        </nav>
      )}

      <FiltrosLancamento {...filtros} />

      {!carregando && !erro && (
        <FaixaIndicadores rotulo={`Totais de ${nomeDoMes(filtros.mes)}`}>
          <CartaoIndicador
            rotulo="Entradas"
            icone={TIPO_LANCAMENTO.recebimento.icone}
            valor={<Saldo valor={entradas} comIcone={false} />}
            detalhe={`${conta('recebimento')} recebimento(s)`}
          />
          <CartaoIndicador
            indice={1}
            rotulo="Saídas"
            icone={TIPO_LANCAMENTO.saida.icone}
            valor={formatarMoeda(-soma('saida'))}
            detalhe={`${conta('saida')} saída(s) de material e serviço`}
          />
          <CartaoIndicador
            indice={2}
            rotulo="Mão de obra"
            icone={TIPO_LANCAMENTO.mao_de_obra.icone}
            valor={formatarMoeda(-soma('mao_de_obra'))}
            detalhe={`${conta('mao_de_obra')} pagamento(s) à equipe`}
          />
          <CartaoIndicador
            indice={3}
            destaque
            rotulo="Resultado do mês"
            valor={<Saldo valor={resultado} />}
            detalhe={
              <>
                {linhas.length} lançamento(s)
                {semComprovante > 0 && (
                  <>
                    {' · '}
                    <span className="font-semibold">{semComprovante} sem comprovante</span>
                  </>
                )}
              </>
            }
          />
        </FaixaIndicadores>
      )}

      {linhas.length > 0 && (
        <BarraFiltros
          busca={busca}
          aoBuscar={setBusca}
          placeholder="Buscar descrição, obra, fornecedor…"
          filtro={tipo}
          aoFiltrar={setTipo}
          filtros={[
            { valor: 'todos', rotulo: 'Tudo', total: linhas.length },
            ...ORDEM.map((t) => ({ valor: t, rotulo: TIPO_LANCAMENTO[t].plural, total: conta(t) })),
          ]}
        />
      )}

      {carregando ? (
        <ListaCarregando />
      ) : erro ? (
        <ListaErro erro={erro.error} aoTentar={() => consultas.forEach((c) => void c.refetch())} />
      ) : visiveis.length === 0 ? (
        <ListaVazia
          icone={ReceiptText}
          titulo="Nenhum lançamento neste mês"
          texto="Registre saídas, recebimentos e pagamentos da equipe pelos atalhos acima."
          filtrando={linhas.length > 0 || filtros.obra !== ''}
          aoLimpar={() => {
            setBusca('')
            setTipo('todos')
            filtros.setObra('')
          }}
        />
      ) : (
        <Extrato linhas={visiveis} />
      )}
    </div>
  )
}

function Extrato({ linhas }: { linhas: readonly Linha[] }) {
  const dias = useMemo(() => {
    const mapa = new Map<string, Linha[]>()
    for (const l of linhas) {
      const d = l.data ?? 'sem-data'
      mapa.set(d, [...(mapa.get(d) ?? []), l])
    }
    return [...mapa.entries()]
  }, [linhas])

  return (
    <div className="grid gap-5">
      {dias.map(([dia, lista]) => {
        const total = lista.reduce((s, l) => s + l.valor, 0)
        const rotulo = dia === 'sem-data' ? 'Sem data' : formatarData(dia, "EEEE, d 'de' MMMM")
        return (
          <section key={dia} aria-label={rotulo} className="grid gap-2">
            <h2 className="flex items-baseline justify-between gap-2 px-1 text-sm">
              <span className="font-semibold first-letter:uppercase">{rotulo}</span>
              <Saldo valor={total} comIcone={false} className="text-sm font-semibold" />
            </h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {lista.map((l) => (
                <li key={`${l.tipo}-${l.id}`}>
                  <Link
                    to={TIPO_LANCAMENTO[l.tipo].para}
                    className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent/40 focus-visible:bg-accent/60 focus-visible:outline-none"
                  >
                    <IconeTipo tipo={l.tipo} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{l.titulo}</span>
                      <span className="block truncate text-sm text-muted-foreground">{l.detalhe}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <Saldo
                        valor={l.valor}
                        comIcone={false}
                        className={cn('text-base font-semibold', l.valor < 0 && 'text-foreground')}
                      />
                      {l.anexo === true && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="size-3" aria-hidden="true" />
                          comprovante
                        </span>
                      )}
                      {l.anexo === false && <span className="text-xs font-semibold text-aviso">sem comprovante</span>}
                    </span>
                    <ChevronRight
                      className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
