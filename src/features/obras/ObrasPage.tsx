import { Building2, ChevronRight, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  BarraFiltros,
  CabecalhoCadastro,
  ListaCarregando,
  ListaErro,
  ListaVazia,
  SeloStatus,
} from '@/components/cadastro'
import { CUSTO_ALTO, TrenaDupla } from '@/components/painel'
import { Saldo } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { useResumoObras } from '@/features/dashboard/useResumoObras'
import { usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { cn } from '@/lib/utils'
import type { Obra, ResumoObra } from '@/types/app'
import { formatarMoedaCompacta, formatarPorcento, num } from '@/utils/format'
import { contem } from '@/utils/texto'
import { situacaoEntrega } from './alertas'
import { type ObraLista, useObras } from './api'
import { FormObra } from './FormObra'

type Filtro = 'abertas' | 'encerradas' | 'todas'
const ENCERRADAS = ['Concluída', 'Cancelada']
const estaEncerrada = (s: string | null) => ENCERRADAS.includes(s ?? '')

export function ObrasPage() {
  const consulta = useObras()
  const resumo = useResumoObras()
  const permissao = usePermissao('obras')
  const p = usePainel<Obra>()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('abertas')

  const todos = useMemo(() => consulta.data ?? [], [consulta.data])
  const porId = useMemo(
    () => new Map((resumo.data?.linhas ?? []).map((r) => [r.ID_Obra, r])),
    [resumo.data],
  )
  const visiveis = useMemo(
    () =>
      todos.filter(
        (o) =>
          (filtro === 'todas' ||
            (filtro === 'encerradas' ? estaEncerrada(o.Status) : !estaEncerrada(o.Status))) &&
          contem(busca, o.Nome_Obra, o.Nome_Cliente),
      ),
    [todos, filtro, busca],
  )
  const encerradas = todos.filter((o) => estaEncerrada(o.Status)).length
  const abertas = (resumo.data?.linhas ?? []).filter((r) => !estaEncerrada(r.Status))

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Obras"
        descricao="Contratos, prazos e andamento."
        rotuloNovo="Nova obra"
        aoCriar={permissao.criar ? p.novo : undefined}
      />

      {abertas.length > 0 && <ResumoCarteira linhas={abertas} />}

      <BarraFiltros
        busca={busca}
        aoBuscar={setBusca}
        placeholder="Buscar obra ou cliente"
        filtro={filtro}
        aoFiltrar={setFiltro}
        filtros={[
          { valor: 'abertas', rotulo: 'Em aberto', total: todos.length - encerradas },
          { valor: 'encerradas', rotulo: 'Encerradas', total: encerradas },
          { valor: 'todas', rotulo: 'Todas', total: todos.length },
        ]}
      />

      {consulta.isPending ? (
        <ListaCarregando />
      ) : consulta.isError ? (
        <ListaErro erro={consulta.error} aoTentar={() => void consulta.refetch()} />
      ) : visiveis.length === 0 ? (
        <ListaVazia
          icone={Building2}
          titulo="Nenhuma obra cadastrada"
          texto="Cadastre a obra para começar a lançar recebimentos e gastos."
          filtrando={todos.length > 0}
          aoLimpar={() => {
            setBusca('')
            setFiltro('todas')
          }}
          acao={permissao.criar && <Button onClick={p.novo}>Cadastrar obra</Button>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-label="Obras">
          {/* grid-cols-1 (= minmax(0,1fr)): sem coluna definida, o título com reticências alargava a lista além da tela no celular */}
          {visiveis.map((o, i) => (
            <li key={o.ID_Obra} className="animate-entrar" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <CartaoObra obra={o} resumo={porId.get(o.ID_Obra)} />
            </li>
          ))}
        </ul>
      )}

      <FormObra
        key={p.painel.modo}
        estado={p.painel}
        aoFechar={p.fechar}
        aoCriar={(id) => navigate(`/obras/${id}`)}
      />
    </div>
  )
}

/* ---------------- Resumo da carteira em aberto ---------------- */

function ResumoCarteira({ linhas }: { linhas: readonly ResumoObra[] }) {
  const soma = (campo: keyof ResumoObra) => linhas.reduce((t, r) => t + num(r[campo] as number | null), 0)
  const custoAlto = linhas.filter((r) => num(r.valor_contratado) > 0 && num(r.custo_total) / num(r.valor_contratado) > CUSTO_ALTO).length
  const itens = [
    { rotulo: 'Carteira em aberto', valor: formatarMoedaCompacta(soma('valor_contratado')) },
    { rotulo: 'A receber', valor: formatarMoedaCompacta(soma('a_receber')) },
    { rotulo: 'Contrato − custo', valor: formatarMoedaCompacta(soma('margem_prevista')), detalhe: 'Custos futuros não estão descontados.' },
    { rotulo: 'Custo acima de 80%', valor: `${custoAlto} de ${linhas.length}`, alerta: custoAlto > 0 },
  ]
  return (
    <dl aria-label="Resumo das obras em aberto" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
      {itens.map((i) => (
        <div key={i.rotulo} className="bg-card px-5 py-4">
          <dt className="text-sm text-muted-foreground">{i.rotulo}</dt>
          <dd className={cn('display numero mt-1 text-xl font-bold sm:text-2xl', i.alerta && 'text-negativo')}>{i.valor}</dd>
          {i.detalhe && <dd className="mt-1 text-xs text-muted-foreground">{i.detalhe}</dd>}
        </div>
      ))}
    </dl>
  )
}

/* ---------------- Cartão da obra ---------------- */

function CartaoObra({ obra: o, resumo: r }: { obra: ObraLista; resumo: ResumoObra | undefined }) {
  const contratado = num(r?.valor_contratado ?? o.Valor_Contratado)
  const recebido = num(r?.total_recebido)
  const custo = num(r?.custo_total)
  const saldo = recebido - custo
  const andamento = o.Status === 'Em Andamento'
  const custoAlto = andamento && contratado > 0 && custo / contratado > CUSTO_ALTO
  const entrega = situacaoEntrega(o.Status, o.Previsao_Termino)

  return (
    <Link
      to={`/obras/${o.ID_Obra}`}
      className={cn(
        'group flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition-colors duration-150 hover:border-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        custoAlto && 'border-negativo/35',
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <SeloStatus status={o.Status} />
        <span
          className={cn(
            'text-sm',
            entrega.nivel === 'critico' ? 'font-semibold text-negativo' : entrega.nivel === 'aviso' ? 'font-semibold text-aviso' : 'text-muted-foreground',
          )}
        >
          {entrega.texto}
        </span>
      </span>

      <span className="min-w-0">
        <span className="display block truncate text-xl leading-tight font-bold">{o.Nome_Obra ?? 'Obra sem nome'}</span>
        <span className="block truncate text-sm text-muted-foreground">{o.Nome_Cliente ?? 'Sem cliente'}</span>
      </span>

      <TrenaDupla nome={o.Nome_Obra ?? ''} contratado={contratado} recebido={recebido} custo={custo} />

      {custoAlto && (
        <span className="flex items-center gap-2 rounded-lg bg-negativo-fundo px-3 py-2 text-sm font-medium text-negativo">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {saldo < 0 ? 'Custo acima do recebido — cobrar a próxima parcela'
            : `Custo em ${formatarPorcento(custo / contratado)} do contratado`}
        </span>
      )}

      <span className="mt-auto grid grid-cols-3 gap-3 border-t pt-4 text-sm">
        <Numero rotulo="Contratado">{formatarMoedaCompacta(contratado)}</Numero>
        <Numero rotulo="Saldo em caixa">
          <Saldo valor={saldo} comIcone={false} className="font-semibold" />
        </Numero>
        <Numero rotulo="Contrato − custo">
          <Saldo valor={r?.margem_prevista ?? contratado - custo} comIcone={false} className="font-semibold" />
        </Numero>
      </span>

      <span className="text-xs text-muted-foreground">Contrato menos custos registrados. Custos futuros não estão descontados.</span>

      <span className="-mt-1 inline-flex items-center justify-end gap-1 text-sm font-medium">
        Ver obra
        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}

function Numero({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <span className="grid min-w-0 gap-0.5">
      <span className="text-xs text-muted-foreground">{rotulo}</span>
      <span className="numero truncate font-semibold">{children}</span>
    </span>
  )
}
