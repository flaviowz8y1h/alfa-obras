import { zodResolver } from '@hookform/resolvers/zod'
import { addDays, parseISO } from 'date-fns'
import { CalendarPlus, CircleCheck, Forklift, PackageCheck, Phone, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
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
} from '@/components/cadastro'
import { Campo } from '@/components/campo'
import { CampoMoeda, CampoTelefone, SelectNativo } from '@/components/campos'
import { CartaoIndicador, FaixaIndicadores } from '@/components/painel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  lerUltimaObra,
  prepararSaida,
  salvarUltimaObra,
  useNovoPelaUrl,
  useOpcoesObra,
  usePreencherUltimaObra,
} from '@/features/lancamentos/hooks'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { COBRANCAS_LOCACAO } from '@/lib/opcoes'
import { cn } from '@/lib/utils'
import { mensagemDeErro } from '@/utils/erros'
import { formatarData, formatarMoeda, formatarNumero, hojeISO, num, paraISO } from '@/utils/format'
import { contem, formatarTelefone, limpar, somenteDigitos } from '@/utils/texto'
import {
  type LocacaoLista,
  useDevolverLocacao,
  useExcluirLocacao,
  useLocacoes,
  useProrrogarLocacao,
  useSalvarLocacao,
} from './api'
import { SeloPrazo } from './componentes'
import { AVISO_DEVOLUCAO, custoDoAtraso, situacaoLocacao, valorSugerido } from './regras'

type Filtro = 'ativas' | 'atrasadas' | 'devolvidas' | 'todas'

const SEM_OBRA = '__sem_obra__'

export function LocacoesPage() {
  const consulta = useLocacoes()
  const permissao = usePermissao('locacoes')
  const p = usePainel<LocacaoLista>()
  const excluir = useExcluirLocacao()
  const devolver = useDevolverLocacao()
  const [prorrogando, setProrrogando] = useState<LocacaoLista | null>(null)
  const [ofertaPagamento, setOfertaPagamento] = useState<LocacaoLista | null>(null)
  const podeLancar = usePermissao('lancamentos').criar
  const lancarPagamento = useLancarPagamento()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('ativas')
  // /locacoes?novo=1&obra=ID (atalho da tela da obra) abre o formulário com a obra escolhida
  useNovoPelaUrl(p.novo)

  const todas = useMemo(() => consulta.data ?? [], [consulta.data])
  const comSituacao = useMemo(() => todas.map((l) => ({ l, ...situacaoLocacao(l) })), [todas])
  const ativas = comSituacao.filter((x) => x.situacao !== 'devolvida')
  const atrasadas = comSituacao.filter((x) => x.situacao === 'atrasada')
  const vencendo = comSituacao.filter((x) => x.situacao === 'hoje' || x.situacao === 'logo')
  const custoAtraso = atrasadas.reduce((t, x) => t + (custoDoAtraso(x.l) ?? 0), 0)

  const visiveis = comSituacao.filter(
    (x) =>
      (filtro === 'todas' ||
        (filtro === 'ativas' && x.situacao !== 'devolvida') ||
        (filtro === 'atrasadas' && x.situacao === 'atrasada') ||
        (filtro === 'devolvidas' && x.situacao === 'devolvida')) &&
      contem(busca, x.l.Equipamento, x.l.Locadora, x.l.Nome_Obra),
  )
  // devolvidas: as mais recentes primeiro; ativas: a que vence primeiro no topo (ordem da consulta)
  if (filtro === 'devolvidas') {
    visiveis.sort((a, b) => (b.l.Data_Devolucao ?? '').localeCompare(a.l.Data_Devolucao ?? ''))
  }

  async function marcarDevolvida(l: LocacaoLista) {
    try {
      await devolver.mutateAsync({ id: l.ID_Locacao, data: hojeISO() })
      // devolveu: hora de lançar o pagamento à locadora, senão o custo não entra na obra
      if (podeLancar && !l.ID_Saida) setOfertaPagamento({ ...l, Data_Devolucao: hojeISO() })
      toast.success(`${l.Equipamento} marcado como devolvido.`, {
        action: {
          label: 'Desfazer',
          onClick: () => void devolver.mutateAsync({ id: l.ID_Locacao, data: null }).catch((e) => toast.error(mensagemDeErro(e))),
        },
      })
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Locações"
        descricao="Equipamentos alugados e o prazo de devolução de cada um."
        rotuloNovo="Nova locação"
        aoCriar={permissao.criar ? p.novo : undefined}
      />

      {todas.length > 0 && (
        <FaixaIndicadores rotulo="Resumo das locações">
          <CartaoIndicador rotulo="Ativas" valor={ativas.length} detalhe="Equipamentos ainda com a empresa" />
          <CartaoIndicador
            indice={1}
            rotulo={`Vencem em até ${AVISO_DEVOLUCAO} dias`}
            valor={<span className={cn(vencendo.length > 0 && 'text-aviso')}>{vencendo.length}</span>}
            detalhe="Inclui as que vencem hoje"
          />
          <CartaoIndicador
            indice={2}
            rotulo="Atrasadas"
            valor={<span className={cn(atrasadas.length > 0 && 'text-negativo')}>{atrasadas.length}</span>}
            detalhe="Passaram da data de devolução"
          />
          <CartaoIndicador
            indice={3}
            destaque
            rotulo="Aluguel a mais por atraso"
            valor={formatarMoeda(custoAtraso)}
            detalhe="Estimativa pela cobrança informada"
          />
        </FaixaIndicadores>
      )}

      <BarraFiltros
        busca={busca}
        aoBuscar={setBusca}
        placeholder="Buscar equipamento, locadora ou obra"
        filtro={filtro}
        aoFiltrar={setFiltro}
        filtros={[
          { valor: 'ativas', rotulo: 'Ativas', total: ativas.length },
          { valor: 'atrasadas', rotulo: 'Atrasadas', total: atrasadas.length },
          { valor: 'devolvidas', rotulo: 'Devolvidas', total: todas.length - ativas.length },
          { valor: 'todas', rotulo: 'Todas', total: todas.length },
        ]}
      />

      {consulta.isPending ? (
        <ListaCarregando />
      ) : consulta.isError ? (
        <ListaErro erro={consulta.error} aoTentar={() => void consulta.refetch()} />
      ) : visiveis.length === 0 ? (
        <ListaVazia
          icone={Forklift}
          titulo={todas.length === 0 ? 'Nenhuma locação cadastrada' : 'Nenhuma locação aqui'}
          texto="Cadastre cada equipamento alugado com a data de devolução: o sistema avisa antes de vencer."
          filtrando={todas.length > 0}
          aoLimpar={() => {
            setBusca('')
            setFiltro('todas')
          }}
          acao={permissao.criar && <Button onClick={p.novo}>Cadastrar locação</Button>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label="Locações">
          {visiveis.map(({ l, situacao }) => (
            <li
              key={l.ID_Locacao}
              className={cn(
                'grid grid-cols-1 gap-3 rounded-xl border bg-card p-4',
                situacao === 'atrasada' && 'border-negativo/30',
                situacao === 'hoje' && 'border-negativo/30',
                situacao === 'logo' && 'border-aviso/40',
              )}
            >
              <button
                type="button"
                onClick={() => (permissao.editar ? p.editar(l) : undefined)}
                disabled={!permissao.editar}
                className="flex min-w-0 cursor-pointer items-start justify-between gap-3 rounded-md text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default"
                aria-label={`Editar locação ${l.Equipamento}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">
                    {l.Equipamento}
                    {num(l.Quantidade) !== 1 && (
                      <span className="numero font-normal text-muted-foreground"> × {formatarNumero(l.Quantidade)}</span>
                    )}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[l.Nome_Obra ?? 'Geral da empresa', l.Locadora].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <SeloPrazo locacao={l} />
              </button>

              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="numero">
                  {formatarData(l.Data_Retirada)} → {formatarData(l.Data_Devolucao_Prevista)}
                </span>
                {num(l.Valor) > 0 && (
                  <span className="numero">
                    {formatarMoeda(l.Valor)}
                    {l.Cobranca && l.Cobranca !== 'Valor fechado' ? ` / ${l.Cobranca.toLowerCase()}` : ''}
                  </span>
                )}
                {custoDoAtraso(l) != null && (
                  <span className="font-semibold text-negativo">≈ {formatarMoeda(custoDoAtraso(l))} a mais</span>
                )}
              </p>

              {situacao !== 'devolvida' && (permissao.editar || l.Telefone_Locadora) && (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {permissao.editar && (
                    <>
                      <Button size="sm" className="min-h-10" onClick={() => void marcarDevolvida(l)} disabled={devolver.isPending}>
                        <PackageCheck aria-hidden="true" />
                        Devolvi
                      </Button>
                      <Button size="sm" variant="outline" className="min-h-10" onClick={() => setProrrogando(l)}>
                        <CalendarPlus aria-hidden="true" />
                        Prorrogar
                      </Button>
                    </>
                  )}
                  {l.Telefone_Locadora && (
                    <a
                      href={`tel:${somenteDigitos(l.Telefone_Locadora)}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <Phone className="size-4" aria-hidden="true" />
                      {formatarTelefone(l.Telefone_Locadora)}
                    </a>
                  )}
                </div>
              )}

              {situacao === 'devolvida' && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
                  {l.ID_Saida ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-positivo">
                      <CircleCheck className="size-4" aria-hidden="true" />
                      Pagamento lançado <span className="numero text-muted-foreground">({l.ID_Saida})</span>
                    </span>
                  ) : (
                    <>
                      <span className="font-medium text-aviso">Pagamento não lançado</span>
                      {podeLancar && (
                        <Button size="sm" variant="outline" className="ml-auto min-h-10" onClick={() => lancarPagamento(l)}>
                          <ReceiptText aria-hidden="true" />
                          Lançar pagamento
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <FormLocacao
        key={p.painel.modo === 'editar' ? p.painel.registro.ID_Locacao : p.painel.modo}
        estado={p.painel}
        aoFechar={p.fechar}
        aoExcluir={permissao.excluir ? p.pedirExclusao : undefined}
      />

      <FormProrrogar key={prorrogando?.ID_Locacao ?? 'nada'} locacao={prorrogando} aoFechar={() => setProrrogando(null)} />

      <OfertaPagamento
        locacao={ofertaPagamento}
        aoFechar={() => setOfertaPagamento(null)}
        aoLancar={(l) => {
          setOfertaPagamento(null)
          lancarPagamento(l)
        }}
      />

      <ConfirmarExclusao
        aberto={p.excluindo !== null}
        aoFechar={p.cancelarExclusao}
        titulo="Excluir locação?"
        texto={
          <>
            A locação de <strong>{p.excluindo?.Equipamento}</strong> será apagada de vez. Se o equipamento só
            voltou para a locadora, use <strong>Devolvi</strong> para manter o histórico.
          </>
        }
        aoConfirmar={async () => {
          if (!p.excluindo) return false
          try {
            await excluir.mutateAsync(p.excluindo.ID_Locacao)
            toast.success('Locação excluída.')
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
    equipamento: z.string().trim().min(2, 'Informe o equipamento.'),
    quantidade: z.string().refine((v) => Number(v.replace(',', '.')) > 0, 'Quantidade deve ser maior que zero.'),
    obra: z.string().min(1, 'Escolha a obra ou "Geral da empresa".'),
    locadora: z.string(),
    telefone: z
      .string()
      .refine((v) => [0, 10, 11].includes(somenteDigitos(v).length), 'Telefone incompleto: use DDD + número.'),
    retirada: z.string().min(1, 'Informe a data de retirada.'),
    prevista: z.string().min(1, 'Informe a data de devolução.'),
    valor: z.number().nullable(),
    cobranca: z.string(),
    observacao: z.string(),
  })
  .refine((d) => !d.retirada || !d.prevista || d.prevista >= d.retirada, {
    path: ['prevista'],
    message: 'A devolução não pode ser antes da retirada.',
  })
type Dados = z.infer<typeof esquema>

function FormLocacao({
  estado,
  aoFechar,
  aoExcluir,
}: {
  estado: EstadoPainel<LocacaoLista>
  aoFechar: () => void
  aoExcluir?: (l: LocacaoLista) => void
}) {
  const salvar = useSalvarLocacao()
  const registro = estado.modo === 'editar' ? estado.registro : null
  const obras = useOpcoesObra(registro?.ID_Obra)
  const opcoesObra = [{ valor: SEM_OBRA, rotulo: 'Geral da empresa (sem obra)' }, ...obras.opcoes]
  const hoje = hojeISO()
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
      equipamento: registro?.Equipamento ?? '',
      quantidade: formatarNumero(registro?.Quantidade ?? 1),
      obra: registro ? (registro.ID_Obra ?? SEM_OBRA) : lerUltimaObra(),
      locadora: registro?.Locadora ?? '',
      telefone: registro?.Telefone_Locadora ?? '',
      retirada: registro?.Data_Retirada ?? hoje,
      prevista: registro?.Data_Devolucao_Prevista ?? paraISO(addDays(parseISO(hoje), 7)),
      valor: registro?.Valor ?? null,
      cobranca: registro?.Cobranca ?? 'Diária',
      observacao: registro?.Observacao ?? '',
    },
  })

  // a lista de obras pode chegar depois do formulário abrir (atalho da tela da obra)
  usePreencherUltimaObra(obras.opcoes, !registro, (id) => {
    if (!getValues('obra')) setValue('obra', id)
  })

  async function enviar(d: Dados) {
    try {
      if (d.obra && d.obra !== SEM_OBRA) salvarUltimaObra(d.obra)
      await salvar.mutateAsync({
        id: registro?.ID_Locacao,
        dados: {
          Equipamento: limpar(d.equipamento) ?? d.equipamento.trim(),
          Quantidade: Number(d.quantidade.replace(',', '.')),
          ID_Obra: d.obra && d.obra !== SEM_OBRA ? d.obra : null,
          Locadora: limpar(d.locadora),
          Telefone_Locadora: somenteDigitos(d.telefone) || null,
          Data_Retirada: d.retirada,
          Data_Devolucao_Prevista: d.prevista,
          Valor: d.valor,
          Cobranca: d.valor ? d.cobranca || null : null,
          Observacao: limpar(d.observacao),
        },
      })
      toast.success(registro ? 'Locação atualizada.' : 'Locação cadastrada. O sistema vai avisar antes da devolução.')
      aoFechar()
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  return (
    <PainelFormulario
      aberto={estado.modo !== 'fechado'}
      aoFechar={aoFechar}
      titulo={registro ? 'Editar locação' : 'Nova locação'}
      idFormulario="form-locacao"
      salvando={salvar.isPending}
      rotuloSalvar={registro ? 'Salvar' : 'Cadastrar'}
      aoExcluir={registro && aoExcluir ? () => aoExcluir(registro) : undefined}
    >
      <form id="form-locacao" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
          <Campo rotulo="Equipamento" erro={errors.equipamento?.message}>
            {(a11y) => <Input {...a11y} {...register('equipamento')} placeholder="Ex.: Betoneira 400L" autoFocus />}
          </Campo>
          <Campo rotulo="Qtd." erro={errors.quantidade?.message}>
            {(a11y) => <Input {...a11y} {...register('quantidade')} inputMode="decimal" className="numero text-right" />}
          </Campo>
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Retirada" erro={errors.retirada?.message}>
            {(a11y) => <Input {...a11y} {...register('retirada')} type="date" />}
          </Campo>
          <Campo rotulo="Devolver até" erro={errors.prevista?.message}>
            {(a11y) => <Input {...a11y} {...register('prevista')} type="date" />}
          </Campo>
        </div>

        <Campo rotulo="Locadora" ajuda="Opcional.">
          {(a11y) => <Input {...a11y} {...register('locadora')} placeholder="Nome da locadora" />}
        </Campo>

        <Campo rotulo="Telefone da locadora" erro={errors.telefone?.message} ajuda="Opcional. Vira um botão para ligar.">
          {(a11y) => (
            <Controller control={control} name="telefone" render={({ field }) => <CampoTelefone {...a11y} {...field} />} />
          )}
        </Campo>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <Campo rotulo="Valor" ajuda="Opcional. Total por período, somando todas as unidades.">
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
                  />
                )}
              />
            )}
          </Campo>
          <Campo rotulo="Cobrança" ajuda="Para estimar o custo do atraso.">
            {(a11y) => <SelectNativo {...a11y} {...register('cobranca')} opcoes={COBRANCAS_LOCACAO} />}
          </Campo>
        </div>

        <Campo rotulo="Observação" ajuda="Opcional.">
          {(a11y) => <Input {...a11y} {...register('observacao')} placeholder="Ex.: contrato nº, caução" />}
        </Campo>
      </form>
    </PainelFormulario>
  )
}

/* ---------------- Prorrogar ---------------- */

function FormProrrogar({ locacao, aoFechar }: { locacao: LocacaoLista | null; aoFechar: () => void }) {
  const prorrogar = useProrrogarLocacao()
  // sugestão: +7 dias a partir da data prevista (ou de hoje, se já venceu)
  const base = locacao && locacao.Data_Devolucao_Prevista > hojeISO() ? locacao.Data_Devolucao_Prevista : hojeISO()
  const [data, setData] = useState(() => paraISO(addDays(parseISO(base), 7)))
  const invalida = !data || (!!locacao && data < locacao.Data_Retirada)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!locacao || invalida) return
    try {
      await prorrogar.mutateAsync({ id: locacao.ID_Locacao, prevista: data })
      toast.success(`Devolução de ${locacao.Equipamento} prorrogada para ${formatarData(data)}.`)
      aoFechar()
    } catch (err) {
      toast.error(mensagemDeErro(err))
    }
  }

  return (
    <PainelFormulario
      aberto={locacao !== null}
      aoFechar={aoFechar}
      titulo="Prorrogar devolução"
      descricao={locacao ? `${locacao.Equipamento} · hoje vence em ${formatarData(locacao.Data_Devolucao_Prevista)}` : undefined}
      idFormulario="form-prorrogar"
      salvando={prorrogar.isPending}
      rotuloSalvar="Prorrogar"
    >
      <form id="form-prorrogar" onSubmit={(e) => void enviar(e)} className="grid gap-5" noValidate>
        <Campo
          rotulo="Nova data de devolução"
          erro={invalida ? 'Escolha uma data a partir da retirada.' : undefined}
          ajuda="Combine a renovação com a locadora antes."
        >
          {(a11y) => <Input {...a11y} type="date" value={data} onChange={(e) => setData(e.target.value)} autoFocus />}
        </Campo>
      </form>
    </PainelFormulario>
  )
}

/* ---------------- Pagamento à locadora ---------------- */

/** Abre "Nova saída" já preenchida com o pagamento da locação (valor sugerido pelos dias de uso). */
function useLancarPagamento() {
  const navigate = useNavigate()
  return (l: LocacaoLista) => {
    const sugestao = valorSugerido(l)
    const qtd = num(l.Quantidade) !== 1 ? ` (×${formatarNumero(l.Quantidade)})` : ''
    const fim = l.Data_Devolucao ?? hojeISO()
    prepararSaida({
      valor: sugestao?.valor,
      descricao: `Locação ${l.Equipamento}${qtd} — ${formatarData(l.Data_Retirada, 'dd/MM')} a ${formatarData(fim, 'dd/MM')}`,
      fornecedor: l.Locadora ?? undefined,
      data: fim > hojeISO() ? hojeISO() : fim,
      categoriaNome: 'Locação de Equipamentos',
      semObra: !l.ID_Obra,
      ajudaValor: sugestao
        ? `Sugerido: ${sugestao.conta}. Confira com a nota da locadora.`
        : 'Confira o valor com a nota da locadora.',
      idLocacao: l.ID_Locacao,
    })
    navigate(`/lancamentos/saidas?novo=1${l.ID_Obra ? `&obra=${encodeURIComponent(l.ID_Obra)}` : ''}`)
  }
}

function OfertaPagamento({
  locacao,
  aoFechar,
  aoLancar,
}: {
  locacao: LocacaoLista | null
  aoFechar: () => void
  aoLancar: (l: LocacaoLista) => void
}) {
  const sugestao = locacao ? valorSugerido(locacao) : null
  return (
    <PainelFormulario
      aberto={locacao !== null}
      aoFechar={aoFechar}
      titulo="Equipamento devolvido"
      descricao={locacao ? `${locacao.Equipamento}${locacao.Locadora ? ` · ${locacao.Locadora}` : ''}` : undefined}
      idFormulario="form-oferta-pagamento"
      salvando={false}
      rotuloSalvar="Lançar pagamento"
    >
      <form
        id="form-oferta-pagamento"
        onSubmit={(e) => {
          e.preventDefault()
          if (locacao) aoLancar(locacao)
        }}
        className="grid gap-4"
      >
        <p className="text-muted-foreground">
          Lance agora o pagamento à locadora para o custo entrar na obra. O formulário de saída abre preenchido
          para você conferir.
        </p>
        {sugestao ? (
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Valor sugerido</p>
            <p className="display numero mt-1 text-3xl font-bold">{formatarMoeda(sugestao.valor)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{sugestao.conta}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta locação não tem valor informado: você digita o valor da nota no formulário.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Prefere lançar depois? A locação fica marcada como <strong>pagamento não lançado</strong> e aparece nas
          pendências da Pauta.
        </p>
      </form>
    </PainelFormulario>
  )
}
