import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, Phone, Users } from 'lucide-react'
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
import { CampoTelefone, SelectNativo } from '@/components/campos'
import { CartaoIndicador, FaixaIndicadores } from '@/components/painel'
import { Moeda, Trena } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useResumoObras } from '@/features/dashboard/useResumoObras'
import { useObras } from '@/features/obras/api'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { STATUS_CADASTRO, comValorAtual } from '@/lib/opcoes'
import { mensagemDeErro } from '@/utils/erros'
import { formatarMoedaCompacta, formatarPorcento, num } from '@/utils/format'
import { contem, formatarTelefone, limpar, somenteDigitos } from '@/utils/texto'
import { type ClienteLista, useClientes, useExcluirCliente, useSalvarCliente } from './api'

type Filtro = 'Ativo' | 'Inativo' | 'todos'

export function ClientesPage() {
  const consulta = useClientes()
  const permissao = usePermissao('clientes')
  const p = usePainel<ClienteLista>()
  const excluir = useExcluirCliente()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('Ativo')

  const todos = useMemo(() => consulta.data ?? [], [consulta.data])
  const visiveis = useMemo(
    () =>
      todos.filter(
        (c) =>
          (filtro === 'todos' || (c.Status ?? 'Ativo') === filtro) &&
          contem(busca, c.Nome_Cliente, c.Telefone_Cliente, somenteDigitos(c.Telefone_Cliente)),
      ),
    [todos, filtro, busca],
  )
  const contar = (s: string) => todos.filter((c) => (c.Status ?? 'Ativo') === s).length
  const carteira = useCarteiraPorCliente()
  const totalCarteira = [...carteira.values()].reduce(
    (t, c) => ({ contratado: t.contratado + c.contratado, recebido: t.recebido + c.recebido, andamento: t.andamento + (c.andamento > 0 ? 1 : 0) }),
    { contratado: 0, recebido: 0, andamento: 0 },
  )

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Clientes"
        descricao="Quem contrata as obras."
        rotuloNovo="Novo cliente"
        aoCriar={permissao.criar ? p.novo : undefined}
      />

      {todos.length > 0 && (
        <FaixaIndicadores rotulo="Resumo dos clientes">
          <CartaoIndicador
            rotulo="Clientes ativos"
            valor={contar('Ativo')}
            detalhe={`${todos.length} no cadastro`}
          />
          <CartaoIndicador
            indice={1}
            rotulo="Com obra em andamento"
            valor={totalCarteira.andamento}
            detalhe="Clientes com pelo menos uma obra rodando"
          />
          <CartaoIndicador
            indice={2}
            rotulo="Carteira contratada"
            valor={formatarMoedaCompacta(totalCarteira.contratado)}
            detalhe="Soma dos contratos de todas as obras"
          />
          <CartaoIndicador
            indice={3}
            destaque
            rotulo="A receber"
            valor={formatarMoedaCompacta(totalCarteira.contratado - totalCarteira.recebido)}
            detalhe={`${formatarPorcento(totalCarteira.contratado ? totalCarteira.recebido / totalCarteira.contratado : 0)} da carteira já recebido`}
          />
        </FaixaIndicadores>
      )}

      <BarraFiltros
        busca={busca}
        aoBuscar={setBusca}
        placeholder="Buscar por nome ou telefone"
        filtro={filtro}
        aoFiltrar={setFiltro}
        filtros={[
          { valor: 'Ativo', rotulo: 'Ativos', total: contar('Ativo') },
          { valor: 'Inativo', rotulo: 'Inativos', total: contar('Inativo') },
          { valor: 'todos', rotulo: 'Todos', total: todos.length },
        ]}
      />

      {consulta.isPending ? (
        <ListaCarregando />
      ) : consulta.isError ? (
        <ListaErro erro={consulta.error} aoTentar={() => void consulta.refetch()} />
      ) : visiveis.length === 0 ? (
        <ListaVazia
          icone={Users}
          titulo="Nenhum cliente cadastrado"
          texto="Cadastre o cliente antes de criar a obra dele."
          filtrando={todos.length > 0}
          aoLimpar={() => {
            setBusca('')
            setFiltro('todos')
          }}
          acao={permissao.criar && <Button onClick={p.novo}>Cadastrar cliente</Button>}
        />
      ) : (
        <ul className="grid gap-2" aria-label="Clientes">
          {visiveis.map((c) => (
            <li key={c.ID_Cliente}>
              <button
                type="button"
                onClick={() => (permissao.editar ? p.editar(c) : undefined)}
                disabled={!permissao.editar}
                className="group flex min-h-18 w-full cursor-pointer items-center gap-4 rounded-xl border bg-card px-4 py-3 text-left transition-colors duration-150 hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-heading text-base font-bold text-secondary-foreground">
                  {(c.Nome_Cliente ?? '?').trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{c.Nome_Cliente ?? 'Sem nome'}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                    {c.Telefone_Cliente && (
                      <span className="numero inline-flex items-center gap-1">
                        <Phone className="size-3.5" aria-hidden="true" />
                        {formatarTelefone(c.Telefone_Cliente)}
                      </span>
                    )}
                    <span>
                      <span className="numero">{c.totalObras}</span> {c.totalObras === 1 ? 'obra' : 'obras'}
                      {(carteira.get(c.ID_Cliente)?.andamento ?? 0) > 0 && (
                        <> · <span className="numero">{carteira.get(c.ID_Cliente)?.andamento}</span> em andamento</>
                      )}
                    </span>
                  </span>
                </span>
                <CarteiraCliente c={carteira.get(c.ID_Cliente)} nome={c.Nome_Cliente ?? ''} />
                <SeloStatus status={c.Status} />
                {permissao.editar && (
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <FormCliente
        key={p.painel.modo === 'editar' ? p.painel.registro.ID_Cliente : p.painel.modo}
        estado={p.painel}
        aoFechar={p.fechar}
        aoExcluir={permissao.excluir ? p.pedirExclusao : undefined}
      />

      <ConfirmarExclusao
        aberto={p.excluindo !== null}
        aoFechar={p.cancelarExclusao}
        titulo="Excluir cliente?"
        texto={
          <>
            <strong>{p.excluindo?.Nome_Cliente}</strong> será apagado de vez. Se ele tiver obras, o
            sistema não deixa excluir — nesse caso, marque como <strong>Inativo</strong>.
          </>
        }
        aoConfirmar={async () => {
          if (!p.excluindo) return false
          try {
            await excluir.mutateAsync(p.excluindo.ID_Cliente)
            toast.success('Cliente excluído.')
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

const esquema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do cliente.'),
  telefone: z
    .string()
    .refine((v) => [0, 10, 11].includes(somenteDigitos(v).length), 'Telefone incompleto: use DDD + número.'),
  status: z.string().min(1),
})
type Dados = z.infer<typeof esquema>

function FormCliente({
  estado,
  aoFechar,
  aoExcluir,
}: {
  estado: EstadoPainel<ClienteLista>
  aoFechar: () => void
  aoExcluir?: (c: ClienteLista) => void
}) {
  const salvar = useSalvarCliente()
  const registro = estado.modo === 'editar' ? estado.registro : null
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: registro?.Nome_Cliente ?? '',
      telefone: registro?.Telefone_Cliente ?? '',
      status: registro?.Status ?? 'Ativo',
    },
  })

  async function enviar(d: Dados) {
    try {
      await salvar.mutateAsync({
        id: registro?.ID_Cliente,
        dados: {
          Nome_Cliente: limpar(d.nome),
          Telefone_Cliente: somenteDigitos(d.telefone) || null,
          Status: d.status,
        },
      })
      toast.success(registro ? 'Cliente atualizado.' : 'Cliente cadastrado.')
      aoFechar()
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  return (
    <PainelFormulario
      aberto={estado.modo !== 'fechado'}
      aoFechar={aoFechar}
      titulo={registro ? 'Editar cliente' : 'Novo cliente'}
      idFormulario="form-cliente"
      salvando={salvar.isPending}
      rotuloSalvar={registro ? 'Salvar' : 'Cadastrar'}
      aoExcluir={registro && aoExcluir ? () => aoExcluir(registro) : undefined}
    >
      <form id="form-cliente" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Nome" erro={errors.nome?.message}>
          {(a11y) => <Input {...a11y} {...register('nome')} autoComplete="name" autoFocus />}
        </Campo>
        <Campo rotulo="Telefone / WhatsApp" erro={errors.telefone?.message} ajuda="Opcional.">
          {(a11y) => (
            <Controller
              control={control}
              name="telefone"
              render={({ field }) => <CampoTelefone {...a11y} {...field} />}
            />
          )}
        </Campo>
        {registro && (
          <Campo rotulo="Status" ajuda="Inativo some das listas de seleção, mas mantém o histórico.">
            {(a11y) => (
              <SelectNativo {...a11y} {...register('status')} opcoes={comValorAtual(STATUS_CADASTRO, registro.Status)} />
            )}
          </Campo>
        )}
      </form>
    </PainelFormulario>
  )
}

/* ---------------- Carteira por cliente ---------------- */

type Carteira = { contratado: number; recebido: number; andamento: number }

/** Contratado, recebido e obras em andamento de cada cliente. */
function useCarteiraPorCliente(): Map<string, Carteira> {
  const obras = useObras()
  const resumo = useResumoObras()
  return useMemo(() => {
    const recebidoPorObra = new Map((resumo.data?.linhas ?? []).map((r) => [r.ID_Obra, num(r.total_recebido)]))
    const mapa = new Map<string, Carteira>()
    for (const o of obras.data ?? []) {
      if (!o.ID_Cliente) continue
      const c = mapa.get(o.ID_Cliente) ?? { contratado: 0, recebido: 0, andamento: 0 }
      c.contratado += num(o.Valor_Contratado)
      c.recebido += recebidoPorObra.get(o.ID_Obra) ?? 0
      if (o.Status === 'Em Andamento') c.andamento++
      mapa.set(o.ID_Cliente, c)
    }
    return mapa
  }, [obras.data, resumo.data])
}

function CarteiraCliente({ c, nome }: { c: Carteira | undefined; nome: string }) {
  if (!c || c.contratado <= 0) return null
  return (
    <span className="hidden w-44 shrink-0 gap-1.5 text-right md:grid">
      <span className="text-xs text-muted-foreground">
        Recebido <span className="numero font-semibold text-foreground">{formatarPorcento(c.recebido / c.contratado)}</span> de{' '}
        <Moeda valor={c.contratado} className="font-semibold text-foreground" />
      </span>
      <Trena parte={c.recebido} total={c.contratado} rotulo={`Recebido do cliente ${nome}`} cor="var(--serie-entrada)" className="h-1.5" />
    </span>
  )
}
