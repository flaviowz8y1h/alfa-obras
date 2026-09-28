import { Building2, CalendarDays, ChevronRight } from 'lucide-react'
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
import { Moeda, Trena } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { useResumoObras } from '@/features/dashboard/useResumoObras'
import { usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import type { Obra } from '@/types/app'
import { formatarData, formatarPorcento, num } from '@/utils/format'
import { contem } from '@/utils/texto'
import { useObras } from './api'
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

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Obras"
        descricao="Contratos, prazos e andamento."
        rotuloNovo="Nova obra"
        aoCriar={permissao.criar ? p.novo : undefined}
      />

      <BarraFiltros
        busca={busca}
        aoBuscar={setBusca}
        placeholder="Buscar por obra ou cliente"
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
        <ul className="grid gap-3 lg:grid-cols-2" aria-label="Obras">
          {visiveis.map((o) => {
            const r = porId.get(o.ID_Obra)
            const contratado = num(o.Valor_Contratado)
            const recebido = num(r?.total_recebido)
            return (
              <li key={o.ID_Obra}>
                <Link
                  to={`/obras/${o.ID_Obra}`}
                  className="group grid h-full gap-4 rounded-xl border bg-card p-5 transition-colors duration-150 hover:border-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-bold">{o.Nome_Obra ?? 'Obra sem nome'}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {o.Nome_Cliente ?? 'Sem cliente'}
                      </span>
                    </span>
                    <SeloStatus status={o.Status} />
                  </span>

                  <span className="grid gap-2">
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        Recebido <Moeda valor={recebido} className="font-semibold text-foreground" /> de{' '}
                        <Moeda valor={contratado} />
                      </span>
                      <span className="numero font-semibold">
                        {formatarPorcento(contratado ? recebido / contratado : 0)}
                      </span>
                    </span>
                    <Trena parte={recebido} total={contratado} rotulo={`Recebido da obra ${o.Nome_Obra ?? ''}`} />
                  </span>

                  <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span className="numero inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      {formatarData(o.Data_Inicio)} → {formatarData(o.Previsao_Termino)}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      Ver obra
                      <ChevronRight
                        className="size-5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
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
