import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  BarraFiltros,
  CabecalhoCadastro,
  ConfirmarExclusao,
  ListaCarregando,
  ListaErro,
  PainelFormulario,
} from '@/components/cadastro'
import { Campo } from '@/components/campo'
import { CampoMoeda, SelectNativo } from '@/components/campos'
import { Moeda } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useResumoObras } from '@/features/dashboard/useResumoObras'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { FORMAS_PAGAMENTO, comValorAtual } from '@/lib/opcoes'
import { mensagemDeErro } from '@/utils/erros'
import { hojeISO, num } from '@/utils/format'
import { contem, limpar } from '@/utils/texto'
import {
  type RecebimentoLista,
  useExcluirRecebimento,
  useRecebimentos,
  useSalvarRecebimento,
} from './api'
import { EscolhaOpcao, FiltrosLancamento, ListaLancamentos, TotalPeriodo } from './comum'
import {
  lerUltimaObra,
  salvarUltimaObra,
  useFiltrosLancamento,
  useNovoPelaUrl,
  useOpcoesObra,
  usePreencherUltimaObra,
} from './hooks'

export function RecebimentosPage() {
  const filtros = useFiltrosLancamento()
  const consulta = useRecebimentos(filtros)
  const permissao = usePermissao('lancamentos')
  const p = usePainel<RecebimentoLista>()
  const excluir = useExcluirRecebimento()
  const [busca, setBusca] = useState('')
  useNovoPelaUrl(p.novo)

  const todos = useMemo(() => consulta.data ?? [], [consulta.data])
  const visiveis = useMemo(
    () => todos.filter((r) => contem(busca, r.Nome_Obra, r.Nome_Cliente, r.Observacao, r.Forma_Pagamento)),
    [todos, busca],
  )
  const total = visiveis.reduce((soma, r) => soma + num(r.Valor_Recebido), 0)

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Recebimentos"
        descricao="Pagamentos recebidos dos clientes por obra."
        rotuloNovo="Novo recebimento"
        aoCriar={permissao.criar ? p.novo : undefined}
      />

      <FiltrosLancamento {...filtros} />

      <TotalPeriodo rotulo="Recebido no mês" total={total} quantidade={visiveis.length} tipo="entrada" />

      {todos.length > 0 && (
        <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por obra, cliente ou observação" />
      )}

      {consulta.isPending ? (
        <ListaCarregando />
      ) : consulta.isError ? (
        <ListaErro erro={consulta.error} aoTentar={() => void consulta.refetch()} />
      ) : (
        <ListaLancamentos
          tipo="entrada"
          podeEditar={permissao.editar}
          aoAbrir={p.editar}
          itens={visiveis.map((r) => ({
            id: r.ID_Recebimento,
            data: r.Data_Recebimento,
            titulo: r.Nome_Obra ?? 'Recebimento',
            detalhe: [r.Nome_Cliente, r.Forma_Pagamento, r.Observacao].filter(Boolean).join(' · '),
            valor: r.Valor_Recebido,
            registro: r,
          }))}
          vazio={{
            titulo: 'Nenhum recebimento neste mês',
            texto: 'Lance cada pagamento do cliente para acompanhar quanto falta receber da obra.',
            filtrando: busca !== '' || filtros.obra !== '',
            aoLimpar: () => {
              setBusca('')
              filtros.setObra('')
            },
            acao: permissao.criar && <Button onClick={p.novo}>Lançar recebimento</Button>,
          }}
        />
      )}

      <FormRecebimento
        key={p.painel.modo === 'editar' ? p.painel.registro.ID_Recebimento : p.painel.modo}
        estado={p.painel}
        aoFechar={p.fechar}
        aoExcluir={permissao.excluir ? p.pedirExclusao : undefined}
      />

      <ConfirmarExclusao
        aberto={p.excluindo !== null}
        aoFechar={p.cancelarExclusao}
        titulo="Excluir recebimento?"
        texto="O lançamento será apagado e o valor volta para o saldo a receber da obra. Não dá para desfazer."
        aoConfirmar={async () => {
          if (!p.excluindo) return false
          try {
            await excluir.mutateAsync(p.excluindo.ID_Recebimento)
            toast.success('Recebimento excluído.')
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
  valor: z.number({ error: 'Informe o valor.' }).positive('O valor precisa ser maior que zero.'),
  obra: z.string().min(1, 'Escolha a obra.'),
  data: z.string().min(1, 'Informe a data.'),
  forma: z.string().min(1, 'Escolha como foi recebido.'),
  observacao: z.string(),
})
type Dados = z.input<typeof esquema>

function FormRecebimento({
  estado,
  aoFechar,
  aoExcluir,
}: {
  estado: EstadoPainel<RecebimentoLista>
  aoFechar: () => void
  aoExcluir?: (r: RecebimentoLista) => void
}) {
  const salvar = useSalvarRecebimento()
  const registro = estado.modo === 'editar' ? estado.registro : null
  const obras = useOpcoesObra(registro?.ID_Obra)
  const resumo = useResumoObras()
  const ultimaObra = lerUltimaObra()

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      valor: registro?.Valor_Recebido != null ? num(registro.Valor_Recebido) : undefined,
      obra: registro?.ID_Obra ?? (obras.opcoes.some((o) => o.valor === ultimaObra) ? ultimaObra : ''),
      data: registro?.Data_Recebimento ?? hojeISO(),
      forma: registro?.Forma_Pagamento ?? 'PIX',
      observacao: registro?.Observacao ?? '',
    },
  })
  usePreencherUltimaObra(obras.opcoes, !registro, (id) => {
    if (!getValues('obra')) setValue('obra', id)
  })

  const obraEscolhida = useWatch({ control, name: 'obra' })
  const situacao = resumo.data?.linhas.find((r) => r.ID_Obra === obraEscolhida)

  async function enviar(d: Dados) {
    try {
      await salvar.mutateAsync({
        id: registro?.ID_Recebimento,
        dados: {
          ID_Obra: d.obra,
          Data_Recebimento: d.data,
          Valor_Recebido: d.valor,
          Forma_Pagamento: d.forma,
          Observacao: limpar(d.observacao),
        },
      })
      salvarUltimaObra(d.obra)
      toast.success(registro ? 'Recebimento atualizado.' : 'Recebimento lançado.')
      aoFechar()
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  return (
    <PainelFormulario
      aberto={estado.modo !== 'fechado'}
      aoFechar={aoFechar}
      titulo={registro ? 'Editar recebimento' : 'Novo recebimento'}
      idFormulario="form-recebimento"
      salvando={salvar.isPending}
      rotuloSalvar={registro ? 'Salvar' : 'Lançar'}
      aoExcluir={registro && aoExcluir ? () => aoExcluir(registro) : undefined}
    >
      <form id="form-recebimento" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Valor recebido" erro={errors.valor?.message}>
          {(a11y) => (
            <Controller
              control={control}
              name="valor"
              render={({ field }) => (
                <CampoMoeda
                  {...a11y}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value ?? null}
                  onChange={(v) => field.onChange(v ?? undefined)}
                  autoFocus
                  className="h-14 text-2xl"
                />
              )}
            />
          )}
        </Campo>

        <Campo rotulo="Obra" erro={errors.obra?.message}>
          {(a11y) => (
            <SelectNativo
              {...a11y}
              {...register('obra')}
              vazio={obras.carregando ? 'Carregando obras…' : 'Escolha a obra'}
              opcoes={obras.opcoes}
            />
          )}
        </Campo>

        {situacao && (
          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Contratado</dt>
              <dd className="font-semibold">
                <Moeda valor={situacao.valor_contratado} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Falta receber</dt>
              <dd className="font-semibold">
                <Moeda valor={situacao.a_receber} />
              </dd>
            </div>
          </dl>
        )}

        <Campo rotulo="Data" erro={errors.data?.message}>
          {(a11y) => <Input {...a11y} {...register('data')} type="date" />}
        </Campo>

        <Campo rotulo="Forma de recebimento" erro={errors.forma?.message}>
          {(a11y) => (
            <Controller
              control={control}
              name="forma"
              render={({ field }) => (
                <EscolhaOpcao
                  {...a11y}
                  rotulo="Forma de recebimento"
                  opcoes={comValorAtual(FORMAS_PAGAMENTO, registro?.Forma_Pagamento)}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Campo>

        <Campo rotulo="Observação" ajuda="Opcional. Ex.: 2ª parcela, sinal, medição de março">
          {(a11y) => <Input {...a11y} {...register('observacao')} autoComplete="off" />}
        </Campo>
      </form>
    </PainelFormulario>
  )
}
