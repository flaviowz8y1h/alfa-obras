import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PainelFormulario } from '@/components/cadastro'
import { Campo } from '@/components/campo'
import { CampoMoeda, SelectNativo } from '@/components/campos'
import { Input } from '@/components/ui/input'
import { useClientes } from '@/features/clientes/api'
import type { EstadoPainel } from '@/hooks/use-painel'
import { STATUS_OBRA, comValorAtual } from '@/lib/opcoes'
import type { Obra } from '@/types/app'
import { mensagemDeErro } from '@/utils/erros'
import { hojeISO, num } from '@/utils/format'
import { limpar } from '@/utils/texto'
import { useSalvarObra } from './api'

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

export function FormObra({
  estado,
  aoFechar,
  aoExcluir,
  aoCriar,
}: {
  estado: EstadoPainel<Obra>
  aoFechar: () => void
  aoExcluir?: (o: Obra) => void
  /** Chamado com o ID da obra nova (ex.: para abrir o detalhe). */
  aoCriar?: (id: string) => void
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
      valor: registro?.Valor_Contratado != null ? num(registro.Valor_Contratado) : undefined,
      inicio: registro?.Data_Inicio ?? hojeISO(),
      previsao: registro?.Previsao_Termino ?? '',
      status: registro?.Status ?? 'Em Andamento',
    },
  })

  async function enviar(d: Dados) {
    try {
      const salva = await salvar.mutateAsync({
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
      if (!registro) aoCriar?.(salva.ID_Obra)
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
