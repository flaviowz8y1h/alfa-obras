import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTrabalhadores } from '@/features/trabalhadores/api'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { FORMAS_PAGAMENTO, TIPOS_PAGAMENTO_MO, comValorAtual } from '@/lib/opcoes'
import { mensagemDeErro } from '@/utils/erros'
import {
  diasUteis,
  formatarData,
  formatarMoeda,
  formatarNumero,
  hojeISO,
  num,
  semanaAtual,
} from '@/utils/format'
import { contem, limpar } from '@/utils/texto'
import {
  type PagamentoLista,
  useExcluirPagamento,
  usePagamentosMaoDeObra,
  useSalvarPagamento,
} from './api'
import { EscolhaOpcao, FiltrosLancamento, ListaLancamentos, TotalPeriodo } from './comum'
import {
  ehContinuar,
  lerUltimaObra,
  salvarUltimaObra,
  useFiltrosLancamento,
  useNovoPelaUrl,
  useOpcoesObra,
} from './hooks'

const ehDiaria = (tipo: string | null | undefined) => tipo === 'Diária'
const centavos = (v: number) => Math.round(v * 100) / 100

export function MaoDeObraPage() {
  const filtros = useFiltrosLancamento()
  const consulta = usePagamentosMaoDeObra(filtros)
  const permissao = usePermissao('lancamentos')
  const p = usePainel<PagamentoLista>()
  const excluir = useExcluirPagamento()
  const [busca, setBusca] = useState('')
  useNovoPelaUrl(p.novo)

  const todos = useMemo(() => consulta.data ?? [], [consulta.data])
  const visiveis = useMemo(
    () => todos.filter((m) => contem(busca, m.Nome_Trabalhador, m.Funcao, m.Nome_Obra, m.Tipo_Pagamento, m.Observacao)),
    [todos, busca],
  )
  const total = visiveis.reduce((soma, m) => soma + num(m.Valor_Pago), 0)

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Mão de obra"
        descricao="Diárias, empreitadas e adiantamentos pagos à equipe."
        rotuloNovo="Novo pagamento"
        aoCriar={permissao.criar ? p.novo : undefined}
      />

      <FiltrosLancamento {...filtros} />

      <TotalPeriodo rotulo="Pago à equipe no mês" total={total} quantidade={visiveis.length} tipo="saida" />

      {todos.length > 0 && (
        <BarraFiltros busca={busca} aoBuscar={setBusca} placeholder="Buscar por trabalhador, função ou obra" />
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
          itens={visiveis.map((m) => ({
            id: m.ID_Pagamento,
            data: m.Data_Pagamento,
            titulo: m.Nome_Trabalhador ?? 'Pagamento',
            detalhe: [
              m.Nome_Obra,
              ehDiaria(m.Tipo_Pagamento) && m.Quantidade_Dias != null
                ? `${formatarNumero(m.Quantidade_Dias)} dia(s) × ${formatarMoeda(m.Valor_Diaria_Aplicado)}`
                : m.Tipo_Pagamento,
              m.Periodo_Inicio && `${formatarData(m.Periodo_Inicio, 'dd/MM')}–${formatarData(m.Periodo_Fim, 'dd/MM')}`,
            ]
              .filter(Boolean)
              .join(' · '),
            valor: m.Valor_Pago,
            registro: m,
          }))}
          vazio={{
            titulo: 'Nenhum pagamento neste mês',
            texto: 'Lance as diárias da semana de cada trabalhador para saber o custo real de mão de obra da obra.',
            filtrando: busca !== '' || filtros.obra !== '',
            aoLimpar: () => {
              setBusca('')
              filtros.setObra('')
            },
            acao: permissao.criar && <Button onClick={p.novo}>Lançar pagamento</Button>,
          }}
        />
      )}

      <FormPagamento
        key={p.painel.modo === 'editar' ? p.painel.registro.ID_Pagamento : p.painel.modo}
        estado={p.painel}
        aoFechar={p.fechar}
        aoExcluir={permissao.excluir ? p.pedirExclusao : undefined}
      />

      <ConfirmarExclusao
        aberto={p.excluindo !== null}
        aoFechar={p.cancelarExclusao}
        titulo="Excluir pagamento?"
        texto={
          <>
            O pagamento de <strong>{p.excluindo?.Nome_Trabalhador}</strong> será apagado e o custo da
            obra recalculado. Não dá para desfazer.
          </>
        }
        aoConfirmar={async () => {
          if (!p.excluindo) return false
          try {
            await excluir.mutateAsync(p.excluindo.ID_Pagamento)
            toast.success('Pagamento excluído.')
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
    trabalhador: z.string().min(1, 'Escolha o trabalhador.'),
    obra: z.string().min(1, 'Escolha a obra.'),
    tipo: z.string().min(1),
    inicio: z.string(),
    fim: z.string(),
    dias: z.number().nullable(),
    diaria: z.number().nullable(),
    valor: z.number().nullable(),
    data: z.string().min(1, 'Informe a data do pagamento.'),
    forma: z.string().min(1, 'Escolha como foi pago.'),
    observacao: z.string(),
  })
  .superRefine((d, ctx) => {
    if (ehDiaria(d.tipo)) {
      if (!d.inicio) ctx.addIssue({ code: 'custom', path: ['inicio'], message: 'Informe o início.' })
      if (!d.fim) ctx.addIssue({ code: 'custom', path: ['fim'], message: 'Informe o fim.' })
      if (d.inicio && d.fim && d.fim < d.inicio)
        ctx.addIssue({ code: 'custom', path: ['fim'], message: 'O fim não pode ser antes do início.' })
      if (!d.dias || d.dias <= 0)
        ctx.addIssue({ code: 'custom', path: ['dias'], message: 'Informe quantos dias trabalhou.' })
      if (!d.diaria || d.diaria <= 0)
        ctx.addIssue({ code: 'custom', path: ['diaria'], message: 'Informe o valor da diária.' })
    } else if (!d.valor || d.valor <= 0) {
      ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Informe o valor pago.' })
    }
  })
type Dados = z.input<typeof esquema>

function FormPagamento({
  estado,
  aoFechar,
  aoExcluir,
}: {
  estado: EstadoPainel<PagamentoLista>
  aoFechar: () => void
  aoExcluir?: (m: PagamentoLista) => void
}) {
  const salvar = useSalvarPagamento()
  const registro = estado.modo === 'editar' ? estado.registro : null
  const obras = useOpcoesObra(registro?.ID_Obra)
  const trabalhadores = useTrabalhadores()
  const ultimaObra = lerUltimaObra()
  const semana = semanaAtual()

  const lista = trabalhadores.data ?? []
  const opcoesTrabalhador = lista
    .filter((t) => t.Status !== 'Inativo' || t.ID_Trabalhador === registro?.ID_Trabalhador)
    .map((t) => ({
      valor: t.ID_Trabalhador,
      rotulo: t.Funcao ? `${t.Nome_Trabalhador} — ${t.Funcao}` : (t.Nome_Trabalhador ?? t.ID_Trabalhador),
    }))

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
      trabalhador: registro?.ID_Trabalhador ?? '',
      obra: registro?.ID_Obra ?? (obras.opcoes.some((o) => o.valor === ultimaObra) ? ultimaObra : ''),
      tipo: registro?.Tipo_Pagamento ?? 'Diária',
      inicio: registro?.Periodo_Inicio ?? semana.inicio,
      fim: registro?.Periodo_Fim ?? semana.fim,
      dias: registro ? (registro.Quantidade_Dias != null ? num(registro.Quantidade_Dias) : null) : diasUteis(semana.inicio, semana.fim),
      diaria: registro?.Valor_Diaria_Aplicado != null ? num(registro.Valor_Diaria_Aplicado) : null,
      valor: registro?.Valor_Pago != null ? num(registro.Valor_Pago) : null,
      data: registro?.Data_Pagamento ?? hojeISO(),
      forma: registro?.Forma_Pagamento ?? 'PIX',
      observacao: registro?.Observacao ?? '',
    },
  })

  const [tipo, dias, diaria, idTrabalhador] = useWatch({
    control,
    name: ['tipo', 'dias', 'diaria', 'trabalhador'],
  })
  const diariaMode = ehDiaria(tipo)
  const totalDiarias = centavos((dias ?? 0) * (diaria ?? 0))
  const trabalhador = lista.find((t) => t.ID_Trabalhador === idTrabalhador)

  function recalcularDias() {
    const { inicio, fim } = getValues()
    if (inicio && fim) setValue('dias', diasUteis(inicio, fim), { shouldValidate: true })
  }

  async function enviar(d: Dados, evento?: React.BaseSyntheticEvent) {
    const continuar = !registro && ehContinuar(evento)
    const emDiaria = ehDiaria(d.tipo)
    try {
      await salvar.mutateAsync({
        id: registro?.ID_Pagamento,
        dados: {
          ID_Trabalhador: d.trabalhador,
          ID_Obra: d.obra,
          Tipo_Pagamento: d.tipo,
          Periodo_Inicio: emDiaria ? d.inicio : null,
          Periodo_Fim: emDiaria ? d.fim : null,
          Quantidade_Dias: emDiaria ? d.dias : null,
          Valor_Diaria_Aplicado: emDiaria ? d.diaria : null,
          Valor_Pago: emDiaria ? centavos((d.dias ?? 0) * (d.diaria ?? 0)) : d.valor,
          Data_Pagamento: d.data,
          Forma_Pagamento: d.forma,
          Observacao: limpar(d.observacao),
        },
      })
      salvarUltimaObra(d.obra)
      toast.success(registro ? 'Pagamento atualizado.' : 'Pagamento lançado.')
      if (continuar) {
        // mesma obra e mesma semana; troca só o trabalhador
        reset({ ...getValues(), trabalhador: '', diaria: null, valor: null, observacao: '' })
        setFocus('trabalhador')
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
      titulo={registro ? 'Editar pagamento' : 'Novo pagamento'}
      idFormulario="form-pagamento"
      salvando={salvar.isPending}
      rotuloSalvar={registro ? 'Salvar' : 'Lançar'}
      salvarENovo={!registro}
      aoExcluir={registro && aoExcluir ? () => aoExcluir(registro) : undefined}
    >
      <form id="form-pagamento" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Trabalhador" erro={errors.trabalhador?.message}>
          {(a11y) => (
            <SelectNativo
              {...a11y}
              {...register('trabalhador', {
                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                  // puxa a diária padrão do trabalhador escolhido
                  const t = lista.find((x) => x.ID_Trabalhador === e.target.value)
                  if (t?.Valor_Diaria_Padrao != null) setValue('diaria', num(t.Valor_Diaria_Padrao))
                },
              })}
              autoFocus
              vazio={trabalhadores.isPending ? 'Carregando…' : 'Escolha o trabalhador'}
              opcoes={opcoesTrabalhador}
            />
          )}
        </Campo>

        {trabalhador?.Chave_PIX && <ChavePix chave={trabalhador.Chave_PIX} />}

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

        <Campo rotulo="Tipo de pagamento">
          {(a11y) => (
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <EscolhaOpcao
                  {...a11y}
                  rotulo="Tipo de pagamento"
                  opcoes={comValorAtual(TIPOS_PAGAMENTO_MO, registro?.Tipo_Pagamento)}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Campo>

        {diariaMode ? (
          <fieldset className="grid gap-5 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">Período trabalhado</legend>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="De" erro={errors.inicio?.message}>
                {(a11y) => <Input {...a11y} {...register('inicio', { onChange: recalcularDias })} type="date" />}
              </Campo>
              <Campo rotulo="Até" erro={errors.fim?.message}>
                {(a11y) => <Input {...a11y} {...register('fim', { onChange: recalcularDias })} type="date" />}
              </Campo>
            </div>
            <div className="grid grid-cols-[7rem_1fr] gap-3">
              <Campo rotulo="Dias" erro={errors.dias?.message}>
                {(a11y) => (
                  <Input
                    {...a11y}
                    {...register('dias', { setValueAs: (v: string) => (v === '' ? null : Number(String(v).replace(',', '.'))) })}
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    className="numero text-center font-mono text-lg"
                  />
                )}
              </Campo>
              <Campo rotulo="Valor da diária" erro={errors.diaria?.message}>
                {(a11y) => (
                  <Controller
                    control={control}
                    name="diaria"
                    render={({ field }) => (
                      <CampoMoeda {...a11y} name={field.name} ref={field.ref} onBlur={field.onBlur} value={field.value} onChange={field.onChange} />
                    )}
                  />
                )}
              </Campo>
            </div>
            <p className="-mt-2 text-sm text-muted-foreground">
              Dias úteis (seg–sex) calculados pelo período. Ajuste se trabalhou sábado ou faltou; aceita meio dia (0,5).
            </p>
            <div className="flex items-baseline justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground">
              <span className="text-sm font-medium">Total a pagar</span>
              <span className="display numero text-2xl font-bold" aria-live="polite">
                {formatarMoeda(totalDiarias)}
              </span>
            </div>
          </fieldset>
        ) : (
          <Campo rotulo="Valor pago" erro={errors.valor?.message}>
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
                    value={field.value}
                    onChange={field.onChange}
                    className="h-14 text-2xl"
                  />
                )}
              />
            )}
          </Campo>
        )}

        <Campo rotulo="Data do pagamento" erro={errors.data?.message}>
          {(a11y) => <Input {...a11y} {...register('data')} type="date" />}
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

        <Campo rotulo="Observação" ajuda="Opcional.">
          {(a11y) => <Input {...a11y} {...register('observacao')} autoComplete="off" />}
        </Campo>
      </form>
    </PainelFormulario>
  )
}

function ChavePix({ chave }: { chave: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <div className="-mt-2 flex items-center gap-3 rounded-lg bg-muted px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Chave PIX</p>
        <p className="truncate font-mono text-sm select-all">{chave}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(chave)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
          } catch {
            toast.error('Não foi possível copiar. Selecione e copie manualmente.')
          }
        }}
      >
        {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copiado ? 'Copiada' : 'Copiar'}
      </Button>
    </div>
  )
}
