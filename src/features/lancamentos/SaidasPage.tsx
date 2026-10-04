import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
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
import { CampoComprovante } from '@/components/campo-comprovante'
import { CampoMoeda, InputSugestoes, SelectNativo } from '@/components/campos'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { apagarComprovante, comprovanteInicial, enviarComprovante } from '@/lib/comprovantes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type CategoriaLista, useCategorias } from '@/features/categorias/api'
import { CHAVE_LOCACOES, vincularPagamentoLocacao } from '@/features/locacoes/api'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { usePermissao, usePodeEditarLancamento } from '@/hooks/use-permissao'
import { FORMAS_PAGAMENTO, comValorAtual } from '@/lib/opcoes'
import { mensagemDeErro } from '@/utils/erros'
import { hojeISO, num } from '@/utils/format'
import { contem, limpar, normalizar } from '@/utils/texto'
import { type SaidaLista, useExcluirSaida, useFornecedores, useSaidas, useSalvarSaida } from './api'
import { avisoDataAntiga, dataLancamento } from './data'
import { EscolhaOpcao, FiltrosLancamento, ListaLancamentos, TotalPeriodo } from './comum'
import {
  ehContinuar,
  lerSaidaPreparada,
  lerUltimaObra,
  limparSaidaPreparada,
  salvarUltimaObra,
  useFiltrosLancamento,
  useNovoPelaUrl,
  useOpcoesObra,
  usePreencherUltimaObra,
} from './hooks'

export function SaidasPage() {
  const filtros = useFiltrosLancamento()
  const consulta = useSaidas(filtros)
  const permissao = usePermissao('lancamentos')
  const podeEditar = usePodeEditarLancamento()
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
          placeholder="Buscar descrição, fornecedor ou categoria"
        />
      )}

      {consulta.isPending ? (
        <ListaCarregando />
      ) : consulta.isError ? (
        <ListaErro erro={consulta.error} aoTentar={() => void consulta.refetch()} />
      ) : (
        <ListaLancamentos
          tipo="saida"
          icone="saida"
          podeEditar={podeEditar}
          aoAbrir={p.editar}
          itens={visiveis.map((s) => ({
            id: s.ID_Saida,
            data: s.Data_Saida,
            titulo: s.Descricao || s.Nome_Categoria || 'Saída',
            detalhe: [s.Nome_Obra ?? 'Geral da empresa', s.Fornecedor_Local, s.Forma_Pagamento].filter(Boolean).join(' · '),
            valor: s.Valor,
            anexo: !!s.Comprovante_URL,
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
            await excluir.mutateAsync({ id: p.excluindo.ID_Saida, comprovante: p.excluindo.Comprovante_URL })
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

/** Para onde a saída vai: grupo do DRE e se entra no custo da obra (vem da categoria). */
function destinoDaSaida(c: CategoriaLista | undefined, semObra: boolean): string | undefined {
  if (!c) return undefined
  const grupo = c.Grupo_DRE ? `Vai para: ${c.Grupo_DRE}` : 'Categoria sem grupo do DRE'
  if (semObra) return `${grupo} · despesa da empresa, fora das obras`
  return c.Impacta_Obra === 'Não' ? `${grupo} · não entra no custo da obra` : `${grupo} · entra no custo da obra`
}

/** Valor do select para saída sem obra (equipamentos, ferramentas, despesas da empresa). Vira ID_Obra nulo. */
const SEM_OBRA = 'empresa'

const esquema = z.object({
  valor: z.number({ error: 'Informe o valor.' }).positive('O valor precisa ser maior que zero.'),
  obra: z.string().min(1, 'Escolha a obra.'),
  categoria: z.string().min(1, 'Escolha a categoria.'),
  data: dataLancamento(),
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

  const opcoesObra = [{ valor: SEM_OBRA, rotulo: 'Geral da empresa (sem obra)' }, ...obras.opcoes]
  const opcoesCategoria = (categorias.data ?? [])
    .filter((c) => c.Status !== 'Inativo' || c.ID_Categoria === registro?.ID_Categoria)
    .map((c) => ({ valor: c.ID_Categoria, rotulo: c.Nome_Categoria ?? c.ID_Categoria }))

  const ultimaObra = lerUltimaObra()
  // vindo de "Lançar pagamento" de uma locação: valores sugeridos (usados uma vez)
  const [pre] = useState(() => (estado.modo === 'novo' ? lerSaidaPreparada() : null))
  useEffect(() => {
    if (estado.modo === 'novo') limparSaidaPreparada()
  }, [estado.modo])
  const [locacaoPendente, setLocacaoPendente] = useState(pre?.idLocacao ?? null)
  const qc = useQueryClient()
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      valor: registro?.Valor != null ? num(registro.Valor) : pre?.valor,
      obra: registro
        ? (registro.ID_Obra ?? SEM_OBRA)
        : pre?.semObra
          ? SEM_OBRA
          : obras.opcoes.some((o) => o.valor === ultimaObra)
          ? ultimaObra
          : '',
      categoria: registro?.ID_Categoria ?? '',
      data: registro?.Data_Saida ?? pre?.data ?? hojeISO(),
      forma: registro?.Forma_Pagamento ?? 'PIX',
      fornecedor: registro?.Fornecedor_Local ?? pre?.fornecedor ?? '',
      descricao: registro?.Descricao ?? pre?.descricao ?? '',
      nota: registro?.Numero_Nota_Fiscal ?? '',
    },
  })
  const obraEscolhida = useWatch({ control, name: 'obra' })
  const dataAntiga = avisoDataAntiga(useWatch({ control, name: 'data' }))
  const idCategoria = useWatch({ control, name: 'categoria' })
  const categoriaEscolhida = categorias.data?.find((c) => c.ID_Categoria === idCategoria)

  usePreencherUltimaObra(obras.opcoes, !registro, (id) => {
    if (!getValues('obra')) setValue('obra', id)
  })

  // a categoria sugerida (ex.: "Locação de Equipamentos") só dá para escolher quando a lista chega
  const preencherCategoria = useEffectEvent((lista: readonly CategoriaLista[]) => {
    if (!pre?.categoriaNome || getValues('categoria')) return
    const alvo = normalizar(pre.categoriaNome)
    const achada = lista.find((c) => c.Status !== 'Inativo' && normalizar(c.Nome_Categoria).includes(alvo))
    if (achada) setValue('categoria', achada.ID_Categoria)
  })
  useEffect(() => {
    if (categorias.data) preencherCategoria(categorias.data)
  }, [categorias.data])

  const { idEmpresa } = useUsuarioLogado()
  const [comprovante, setComprovante] = useState(() => comprovanteInicial(registro?.Comprovante_URL ?? null))
  const [enviandoArquivo, setEnviandoArquivo] = useState(false)

  async function enviar(d: Dados, evento?: React.BaseSyntheticEvent) {
    const continuar = !registro && ehContinuar(evento)
    // 1) sobe o arquivo novo (se houver) antes de gravar o lançamento
    let caminhoNovo: string | null = null
    if (comprovante.novo) {
      setEnviandoArquivo(true)
      try {
        caminhoNovo = await enviarComprovante(comprovante.novo, idEmpresa, d.obra)
      } catch (e) {
        setEnviandoArquivo(false)
        toast.error(`Não foi possível enviar o comprovante. ${mensagemDeErro(e)}`)
        return
      }
      setEnviandoArquivo(false)
    }
    const caminhoFinal = caminhoNovo ?? (comprovante.remover ? null : comprovante.atual)

    let salva: { ID_Saida: string }
    try {
      salva = await salvar.mutateAsync({
        id: registro?.ID_Saida,
        dados: {
          ID_Obra: d.obra === SEM_OBRA ? null : d.obra,
          ID_Categoria: d.categoria,
          Data_Saida: d.data,
          Valor: d.valor,
          Forma_Pagamento: d.forma,
          Fornecedor_Local: limpar(d.fornecedor),
          Descricao: limpar(d.descricao),
          Numero_Nota_Fiscal: limpar(d.nota),
          Comprovante_URL: caminhoFinal,
        },
      })
    } catch (e) {
      // lançamento não gravou: o arquivo recém-enviado ficaria solto
      await apagarComprovante(caminhoNovo)
      toast.error(mensagemDeErro(e))
      return
    }

    // 2) o arquivo antigo só sai depois que o lançamento já aponta para o novo
    if (comprovante.atual && comprovante.atual !== caminhoFinal) await apagarComprovante(comprovante.atual)

    // pagamento de locação: liga a saída à locação (uma vez só, mesmo com "lançar outro")
    if (locacaoPendente) {
      try {
        await vincularPagamentoLocacao(locacaoPendente, salva.ID_Saida)
        setLocacaoPendente(null)
        void qc.invalidateQueries({ queryKey: [CHAVE_LOCACOES] })
      } catch (e) {
        toast.warning(`Saída lançada, mas não foi possível marcar a locação como paga. ${mensagemDeErro(e)}`)
      }
    }

    if (d.obra !== SEM_OBRA) salvarUltimaObra(d.obra)
    toast.success(registro ? 'Saída atualizada.' : 'Saída lançada.')
    if (continuar) {
      // mantém obra, data e forma — o caso comum é lançar várias notas do mesmo dia
      const atual = getValues()
      reset({ ...atual, valor: undefined, fornecedor: '', descricao: '', nota: '' })
      setComprovante(comprovanteInicial(null))
      setFocus('valor')
    } else {
      aoFechar()
    }
  }

  return (
    <PainelFormulario
      aberto={estado.modo !== 'fechado'}
      aoFechar={aoFechar}
      titulo={registro ? 'Editar saída' : 'Nova saída'}
      idFormulario="form-saida"
      salvando={salvar.isPending || enviandoArquivo}
      rotuloSalvar={registro ? 'Salvar' : 'Lançar'}
      salvarENovo={!registro}
      aoExcluir={registro && aoExcluir ? () => aoExcluir(registro) : undefined}
    >
      <form id="form-saida" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Valor" erro={errors.valor?.message} ajuda={pre?.ajudaValor}>
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
              opcoes={opcoesObra}
            />
          )}
        </Campo>

        <Campo rotulo="Categoria" erro={errors.categoria?.message} ajuda={destinoDaSaida(categoriaEscolhida, obraEscolhida === SEM_OBRA)}>
          {(a11y) => (
            <SelectNativo
              {...a11y}
              {...register('categoria')}
              vazio={categorias.isPending ? 'Carregando…' : 'Escolha a categoria'}
              opcoes={opcoesCategoria}
            />
          )}
        </Campo>

        <Campo rotulo="Data" erro={errors.data?.message} ajuda={dataAntiga && <span className="font-medium text-aviso">{dataAntiga}</span>}>
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

        <CampoComprovante valor={comprovante} onChange={setComprovante} />
      </form>
    </PainelFormulario>
  )
}
