import { zodResolver } from '@hookform/resolvers/zod'
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
  PainelFormulario,
} from '@/components/cadastro'
import { Campo } from '@/components/campo'
import { CampoMoeda, InputSugestoes, SelectNativo } from '@/components/campos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategorias } from '@/features/categorias/api'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { FORMAS_PAGAMENTO, comValorAtual } from '@/lib/opcoes'
import { mensagemDeErro } from '@/utils/erros'
import { hojeISO, num } from '@/utils/format'
import { contem, limpar } from '@/utils/texto'
import { type SaidaLista, useExcluirSaida, useFornecedores, useSaidas, useSalvarSaida } from './api'
import { EscolhaOpcao, FiltrosLancamento, ListaLancamentos, TotalPeriodo } from './comum'
import {
  ehContinuar,
  lerUltimaObra,
  salvarUltimaObra,
  useFiltrosLancamento,
  useNovoPelaUrl,
  useOpcoesObra,
} from './hooks'

export function SaidasPage() {
  const filtros = useFiltrosLancamento()
  const consulta = useSaidas(filtros)
  const permissao = usePermissao('lancamentos')
  const p = usePainel<SaidaLista>()
  const excluir = useExcluirSaida()
  const [busca, setBusca] = useState('')
  useNovoPelaUrl(p.novo)

  const todos = useMemo(() => consulta.data ?? [], [consulta.data])
  const visiveis = useMemo(
    () =>
      todos.filter((s) =>
        contem(busca, s.Descricao, s.Fornecedor_Local, s.Nome_Categoria, s.Nome_Obra, s.Numero_Nota_Fiscal),
      ),
    [todos, busca],
  )
  const total = visiveis.reduce((soma, s) => soma + num(s.Valor), 0)

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Saídas"
        descricao="Material, ferramentas, frete e demais gastos por obra."
        rotuloNovo="Nova saída"
        aoCriar={permissao.criar ? p.novo : undefined}
      />

      <FiltrosLancamento {...filtros} />

      <TotalPeriodo rotulo="Total de saídas no mês" total={total} quantidade={visiveis.length} tipo="saida" />

      {todos.length > 0 && (
        <BarraFiltros
          busca={busca}
          aoBuscar={setBusca}
          placeholder="Buscar por descrição, fornecedor ou categoria"
        />
      )}

      {consulta.isPending ? (
        <ListaCarregando />
      ) : consulta.isError ? (
        <ListaErro erro={consulta.error} aoTentar={() => void consulta.refetch()} />
      ) : (
        <ListaLancamentos
          tipo="saida"
          podeEditar={permissao.editar}
          aoAbrir={p.editar}
          itens={visiveis.map((s) => ({
            id: s.ID_Saida,
            data: s.Data_Saida,
            titulo: s.Descricao || s.Nome_Categoria || 'Saída',
            detalhe: [s.Nome_Obra, s.Fornecedor_Local, s.Forma_Pagamento].filter(Boolean).join(' · '),
            valor: s.Valor,
            registro: s,
          }))}
          vazio={{
            titulo: 'Nenhuma saída neste mês',
            texto: 'Lance cada compra ou gasto assim que acontecer — dá menos de um minuto.',
            filtrando: busca !== '' || filtros.obra !== '',
            aoLimpar: () => {
              setBusca('')
              filtros.setObra('')
            },
            acao: permissao.criar && <Button onClick={p.novo}>Lançar saída</Button>,
          }}
        />
      )}

      <FormSaida
        key={p.painel.modo === 'editar' ? p.painel.registro.ID_Saida : p.painel.modo}
        estado={p.painel}
        aoFechar={p.fechar}
        aoExcluir={permissao.excluir ? p.pedirExclusao : undefined}
      />

      <ConfirmarExclusao
        aberto={p.excluindo !== null}
        aoFechar={p.cancelarExclusao}
        titulo="Excluir saída?"
        texto="O lançamento será apagado e os totais da obra serão recalculados. Não dá para desfazer."
        aoConfirmar={async () => {
          if (!p.excluindo) return false
          try {
            await excluir.mutateAsync(p.excluindo.ID_Saida)
            toast.success('Saída excluída.')
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
  categoria: z.string().min(1, 'Escolha a categoria.'),
  data: z.string().min(1, 'Informe a data.'),
  forma: z.string().min(1, 'Escolha como foi pago.'),
  fornecedor: z.string(),
  descricao: z.string(),
  nota: z.string(),
})
type Dados = z.input<typeof esquema>

function FormSaida({
  estado,
  aoFechar,
  aoExcluir,
}: {
  estado: EstadoPainel<SaidaLista>
  aoFechar: () => void
  aoExcluir?: (s: SaidaLista) => void
}) {
  const salvar = useSalvarSaida()
  const registro = estado.modo === 'editar' ? estado.registro : null
  const obras = useOpcoesObra(registro?.ID_Obra)
  const categorias = useCategorias()
  const fornecedores = useFornecedores()

  const opcoesCategoria = (categorias.data ?? [])
    .filter((c) => c.Status !== 'Inativo' || c.ID_Categoria === registro?.ID_Categoria)
    .map((c) => ({ valor: c.ID_Categoria, rotulo: c.Nome_Categoria ?? c.ID_Categoria }))

  const ultimaObra = lerUltimaObra()
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setFocus,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      valor: registro?.Valor != null ? num(registro.Valor) : undefined,
      obra: registro?.ID_Obra ?? (obras.opcoes.some((o) => o.valor === ultimaObra) ? ultimaObra : ''),
      categoria: registro?.ID_Categoria ?? '',
      data: registro?.Data_Saida ?? hojeISO(),
      forma: registro?.Forma_Pagamento ?? 'PIX',
      fornecedor: registro?.Fornecedor_Local ?? '',
      descricao: registro?.Descricao ?? '',
      nota: registro?.Numero_Nota_Fiscal ?? '',
    },
  })

  async function enviar(d: Dados, evento?: React.BaseSyntheticEvent) {
    const continuar = !registro && ehContinuar(evento)
    try {
      await salvar.mutateAsync({
        id: registro?.ID_Saida,
        dados: {
          ID_Obra: d.obra,
          ID_Categoria: d.categoria,
          Data_Saida: d.data,
          Valor: d.valor,
          Forma_Pagamento: d.forma,
          Fornecedor_Local: limpar(d.fornecedor),
          Descricao: limpar(d.descricao),
          Numero_Nota_Fiscal: limpar(d.nota),
        },
      })
      salvarUltimaObra(d.obra)
      toast.success(registro ? 'Saída atualizada.' : 'Saída lançada.')
      if (continuar) {
        // mantém obra, data e forma — o caso comum é lançar várias notas do mesmo dia
        const atual = getValues()
        reset({ ...atual, valor: undefined, fornecedor: '', descricao: '', nota: '' })
        setFocus('valor')
      } else {
        aoFechar()
      }
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  return (
    <PainelFormulario
      aberto={estado.modo !== 'fechado'}
      aoFechar={aoFechar}
      titulo={registro ? 'Editar saída' : 'Nova saída'}
      idFormulario="form-saida"
      salvando={salvar.isPending}
      rotuloSalvar={registro ? 'Salvar' : 'Lançar'}
      salvarENovo={!registro}
      aoExcluir={registro && aoExcluir ? () => aoExcluir(registro) : undefined}
    >
      <form id="form-saida" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Valor" erro={errors.valor?.message}>
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

        <Campo rotulo="Categoria" erro={errors.categoria?.message}>
          {(a11y) => (
            <SelectNativo
              {...a11y}
              {...register('categoria')}
              vazio={categorias.isPending ? 'Carregando…' : 'Escolha a categoria'}
              opcoes={opcoesCategoria}
            />
          )}
        </Campo>

        <Campo rotulo="Data" erro={errors.data?.message}>
          {(a11y) => <Input {...a11y} {...register('data')} type="date" max={hojeISO()} />}
        </Campo>

        <Campo rotulo="Forma de pagamento" erro={errors.forma?.message}>
          {(a11y) => (
            <Controller
              control={control}
              name="forma"
              render={({ field }) => (
                <EscolhaOpcao
                  {...a11y}
                  rotulo="Forma de pagamento"
                  opcoes={comValorAtual(FORMAS_PAGAMENTO, registro?.Forma_Pagamento)}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Campo>

        <Campo rotulo="Fornecedor / local" ajuda="Opcional. Ex.: Depósito São José">
          {(a11y) => (
            <InputSugestoes {...a11y} {...register('fornecedor')} sugestoes={fornecedores.data ?? []} />
          )}
        </Campo>

        <Campo rotulo="Descrição" ajuda="Opcional. Ex.: 20 sacos de cimento">
          {(a11y) => <Input {...a11y} {...register('descricao')} autoComplete="off" />}
        </Campo>

        <Campo rotulo="Nº da nota fiscal" ajuda="Opcional.">
          {(a11y) => <Input {...a11y} {...register('nota')} inputMode="numeric" autoComplete="off" />}
        </Campo>
      </form>
    </PainelFormulario>
  )
}
