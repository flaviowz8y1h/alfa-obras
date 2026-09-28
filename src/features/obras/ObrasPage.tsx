import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, CalendarDays, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  BarraFiltros,
  CabecalhoCadastro,
  ConfirmarExclusao,
  ListaCarregando,
  ListaErro,
  ListaVazia,
  PainelFormulario,
  SeloStatus,
} from '@/components/cadastro'
import { Campo } from '@/components/campo'
import { CampoMoeda, SelectNativo } from '@/components/campos'
import { Moeda, Trena } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClientes } from '@/features/clientes/api'
import { useResumoObras } from '@/features/dashboard/useResumoObras'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { STATUS_OBRA, comValorAtual } from '@/lib/opcoes'
import { mensagemDeErro } from '@/utils/erros'
import { formatarData, formatarPorcento, hojeISO, num } from '@/utils/format'
import { contem, limpar } from '@/utils/texto'
import { type ObraLista, useExcluirObra, useObras, useSalvarObra } from './api'

type Filtro = 'abertas' | 'encerradas' | 'todas'
const ENCERRADAS = ['Concluída', 'Cancelada']
const estaEncerrada = (s: string | null) => ENCERRADAS.includes(s ?? '')

export function ObrasPage() {
  const consulta = useObras()
  const resumo = useResumoObras()
  const permissao = usePermissao('obras')
  const p = usePainel<ObraLista>()
  const excluir = useExcluirObra()
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
                <button
                  type="button"
                  onClick={() => permissao.editar && p.editar(o)}
                  disabled={!permissao.editar}
                  className="group grid h-full w-full cursor-pointer gap-4 rounded-xl border bg-card p-5 text-left transition-colors duration-150 hover:border-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default"
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
                    {permissao.editar && (
                      <ChevronRight
                        className="size-5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <FormObra
        key={p.painel.modo === 'editar' ? p.painel.registro.ID_Obra : p.painel.modo}
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
            <strong>{p.excluindo?.Nome_Obra}</strong> será apagada de vez. Se já houver lançamentos
            nela, o sistema não deixa excluir — mude o status para <strong>Cancelada</strong>.
          </>
        }
        aoConfirmar={async () => {
          if (!p.excluindo) return false
          try {
            await excluir.mutateAsync(p.excluindo.ID_Obra)
            toast.success('Obra excluída.')
            p.fechar()
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

/* ---------------- Formulário ---------------- */

const esquema = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome da obra.'),
    cliente: z.string().min(1, 'Escolha o cliente.'),
    valor: z.number({ error: 'Informe o valor contratado.' }).positive('O valor precisa ser maior que zero.'),
    inicio: z.string(),
    previsao: z.string(),
    status: z.string().min(1),
  })
  .refine((d) => !d.inicio || !d.previsao || d.previsao >= d.inicio, {
    path: ['previsao'],
    message: 'A previsão de término não pode ser antes do início.',
  })
type Dados = z.input<typeof esquema>

function FormObra({
  estado,
  aoFechar,
  aoExcluir,
}: {
  estado: EstadoPainel<ObraLista>
  aoFechar: () => void
  aoExcluir?: (o: ObraLista) => void
}) {
  const salvar = useSalvarObra()
  const clientes = useClientes()
  const registro = estado.modo === 'editar' ? estado.registro : null

  // Só clientes ativos — mais o atual, caso tenha sido inativado depois.
  const opcoesCliente = (clientes.data ?? [])
    .filter((c) => c.Status !== 'Inativo' || c.ID_Cliente === registro?.ID_Cliente)
    .map((c) => ({ valor: c.ID_Cliente, rotulo: c.Nome_Cliente ?? c.ID_Cliente }))

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: registro?.Nome_Obra ?? '',
      cliente: registro?.ID_Cliente ?? '',
      valor: registro?.Valor_Contratado ?? undefined,
      inicio: registro?.Data_Inicio ?? hojeISO(),
      previsao: registro?.Previsao_Termino ?? '',
      status: registro?.Status ?? 'Em Andamento',
    },
  })

  async function enviar(d: Dados) {
    try {
      await salvar.mutateAsync({
        id: registro?.ID_Obra,
        dados: {
          Nome_Obra: limpar(d.nome),
          ID_Cliente: d.cliente,
          Valor_Contratado: d.valor,
          Data_Inicio: d.inicio || null,
          Previsao_Termino: d.previsao || null,
          Status: d.status,
        },
      })
      toast.success(registro ? 'Obra atualizada.' : 'Obra cadastrada.')
      aoFechar()
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  return (
    <PainelFormulario
      aberto={estado.modo !== 'fechado'}
      aoFechar={aoFechar}
      titulo={registro ? 'Editar obra' : 'Nova obra'}
      idFormulario="form-obra"
      salvando={salvar.isPending}
      rotuloSalvar={registro ? 'Salvar' : 'Cadastrar'}
      aoExcluir={registro && aoExcluir ? () => aoExcluir(registro) : undefined}
    >
      <form id="form-obra" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Nome da obra" erro={errors.nome?.message} ajuda="Ex.: Reforma cozinha — Rua das Flores, 120">
          {(a11y) => <Input {...a11y} {...register('nome')} autoFocus />}
        </Campo>

        <Campo
          rotulo="Cliente"
          erro={errors.cliente?.message}
          ajuda={
            !clientes.isPending && opcoesCliente.length === 0
              ? 'Nenhum cliente ativo. Cadastre o cliente primeiro na tela Clientes.'
              : undefined
          }
        >
          {(a11y) => (
            <SelectNativo
              {...a11y}
              {...register('cliente')}
              vazio={clientes.isPending ? 'Carregando clientes…' : 'Escolha o cliente'}
              opcoes={opcoesCliente}
            />
          )}
        </Campo>

        <Campo rotulo="Valor contratado" erro={errors.valor?.message}>
          {(a11y) => (
            <Controller
              control={control}
              name="valor"
              render={({ field }) => (
                <CampoMoeda
                  {...a11y}
                  name={field.name}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  value={field.value ?? null}
                  onChange={(v) => field.onChange(v ?? undefined)}
                />
              )}
            />
          )}
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Início" erro={errors.inicio?.message}>
            {(a11y) => <Input {...a11y} {...register('inicio')} type="date" />}
          </Campo>
          <Campo rotulo="Previsão de término" erro={errors.previsao?.message}>
            {(a11y) => <Input {...a11y} {...register('previsao')} type="date" />}
          </Campo>
        </div>

        <Campo rotulo="Status">
          {(a11y) => (
            <SelectNativo
              {...a11y}
              {...register('status')}
              opcoes={comValorAtual(STATUS_OBRA, registro?.Status)}
            />
          )}
        </Campo>
      </form>
    </PainelFormulario>
  )
}
