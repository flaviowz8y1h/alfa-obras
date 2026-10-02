import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, Lock, Tags } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { SelectNativo } from '@/components/campos'
import { CartaoIndicador, FaixaIndicadores } from '@/components/painel'
import { Moeda, Trena } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { GRUPOS_DRE, SIM_NAO, STATUS_CADASTRO, TIPOS_CUSTO, comValorAtual } from '@/lib/opcoes'
import { mensagemDeErro } from '@/utils/erros'
import { formatarMoedaCompacta, formatarPorcento } from '@/utils/format'
import { contem, limpar } from '@/utils/texto'
import {
  type CategoriaLista,
  useCategorias,
  useExcluirCategoria,
  useGastoPorCategoria,
  useSalvarCategoria,
} from './api'

type Filtro = 'Ativo' | 'Inativo' | 'todos'

export function CategoriasPage() {
  const consulta = useCategorias()
  const permissao = usePermissao('categorias')
  const p = usePainel<CategoriaLista>()
  const excluir = useExcluirCategoria()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('Ativo')

  const todos = useMemo(() => consulta.data ?? [], [consulta.data])
  const contar = (s: string) => todos.filter((c) => (c.Status ?? 'Ativo') === s).length
  const gasto = useGastoPorCategoria()
  const gastoDe = (id: string) => gasto.data?.get(id) ?? 0
  const gastoTotal = [...(gasto.data?.values() ?? [])].reduce((a, b) => a + b, 0)
  const maior = todos.reduce<CategoriaLista | null>((m, c) => (!m || gastoDe(c.ID_Categoria) > gastoDe(m.ID_Categoria) ? c : m), null)
  const semUso = todos.filter((c) => (c.Status ?? 'Ativo') === 'Ativo' && c.totalSaidas === 0).length

  // agrupadas pelo grupo do DRE, na ordem da lista padrão
  const grupos = useMemo(() => {
    const filtradas = todos.filter(
      (c) =>
        (filtro === 'todos' || (c.Status ?? 'Ativo') === filtro) &&
        contem(busca, c.Nome_Categoria, c.Grupo_DRE, c.Tipo_Custo),
    )
    const mapa = new Map<string, CategoriaLista[]>()
    for (const c of filtradas) {
      const g = c.Grupo_DRE ?? 'Sem grupo'
      mapa.set(g, [...(mapa.get(g) ?? []), c])
    }
    const ordem = (g: string) => {
      const i = (GRUPOS_DRE as readonly string[]).indexOf(g)
      return i === -1 ? 99 : i
    }
    return [...mapa.entries()].sort(([a], [b]) => ordem(a) - ordem(b))
  }, [todos, filtro, busca])

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Categorias"
        descricao="Como os gastos são classificados no resultado (DRE)."
        rotuloNovo="Nova categoria"
        aoCriar={permissao.criar ? p.novo : undefined}
      />

      {!permissao.editar && (
        <p className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          Só o proprietário e administradores podem criar ou alterar categorias.
        </p>
      )}

      {todos.length > 0 && (
        <FaixaIndicadores rotulo="Resumo das categorias">
          <CartaoIndicador
            destaque
            rotulo="Gasto classificado"
            valor={gasto.isPending ? '…' : formatarMoedaCompacta(gastoTotal)}
            detalhe="Todas as saídas, de todas as obras"
          />
          <CartaoIndicador
            indice={1}
            rotulo="Maior categoria"
            valor={maior && gastoDe(maior.ID_Categoria) > 0 ? formatarMoedaCompacta(gastoDe(maior.ID_Categoria)) : '—'}
            detalhe={
              maior && gastoDe(maior.ID_Categoria) > 0
                ? `${maior.Nome_Categoria} · ${formatarPorcento(gastoDe(maior.ID_Categoria) / (gastoTotal || 1))} do total`
                : 'Nenhuma saída lançada ainda'
            }
          />
          <CartaoIndicador indice={2} rotulo="Categorias ativas" valor={contar('Ativo')} detalhe={`${todos.length} no cadastro`} />
          <CartaoIndicador
            indice={3}
            rotulo="Ativas sem uso"
            valor={semUso}
            detalhe="Nenhuma saída lançada nelas até agora"
          />
        </FaixaIndicadores>
      )}

      <BarraFiltros
        busca={busca}
        aoBuscar={setBusca}
        placeholder="Buscar categoria"
        filtro={filtro}
        aoFiltrar={setFiltro}
        filtros={[
          { valor: 'Ativo', rotulo: 'Ativas', total: contar('Ativo') },
          { valor: 'Inativo', rotulo: 'Inativas', total: contar('Inativo') },
          { valor: 'todos', rotulo: 'Todas', total: todos.length },
        ]}
      />

      {consulta.isPending ? (
        <ListaCarregando />
      ) : consulta.isError ? (
        <ListaErro erro={consulta.error} aoTentar={() => void consulta.refetch()} />
      ) : grupos.length === 0 ? (
        <ListaVazia
          icone={Tags}
          titulo="Nenhuma categoria cadastrada"
          texto="As categorias classificam cada saída: material, ferramenta, frete…"
          filtrando={todos.length > 0}
          aoLimpar={() => {
            setBusca('')
            setFiltro('todos')
          }}
          acao={permissao.criar && <Button onClick={p.novo}>Cadastrar categoria</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {grupos.map(([grupo, itens]) => (
            <section key={grupo} aria-labelledby={`grupo-${grupo}`} className="grid grid-cols-1 gap-2">
              <h2
                id={`grupo-${grupo}`}
                className="flex items-baseline gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                {grupo}
                <span className="numero font-normal">{itens.length}</span>
                {gastoTotal > 0 && (
                  <span className="numero ml-auto font-semibold normal-case">
                    {formatarMoedaCompacta(itens.reduce((t, c) => t + gastoDe(c.ID_Categoria), 0))}
                  </span>
                )}
              </h2>
              <ul className="grid grid-cols-1 gap-2">
                {itens.map((c) => (
                  <li key={c.ID_Categoria}>
                    <button
                      type="button"
                      onClick={() => permissao.editar && p.editar(c)}
                      disabled={!permissao.editar}
                      className="group flex min-h-16 w-full cursor-pointer items-center gap-4 rounded-xl border bg-card px-4 py-3 text-left transition-colors duration-150 hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default disabled:hover:border-border disabled:hover:bg-card"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold">
                          {c.Nome_Categoria ?? 'Sem nome'}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {[
                            c.Tipo_Custo,
                            c.Impacta_Obra === 'Não' ? 'Não entra no custo da obra' : 'Entra no custo da obra',
                            `${c.totalSaidas} ${c.totalSaidas === 1 ? 'lançamento' : 'lançamentos'}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      {gastoDe(c.ID_Categoria) > 0 && (
                        <span className="hidden w-40 shrink-0 gap-1.5 text-right sm:grid">
                          <span className="text-xs text-muted-foreground">
                            <Moeda valor={gastoDe(c.ID_Categoria)} className="font-semibold text-foreground" /> ·{' '}
                            {formatarPorcento(gastoDe(c.ID_Categoria) / (gastoTotal || 1))}
                          </span>
                          <Trena
                            parte={gastoDe(c.ID_Categoria)}
                            total={gastoTotal}
                            rotulo={`Participação de ${c.Nome_Categoria ?? 'categoria'} no gasto total`}
                            cor="var(--serie-saida)"
                            className="h-1.5"
                          />
                        </span>
                      )}
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
            </section>
          ))}
        </div>
      )}

      <FormCategoria
        key={p.painel.modo === 'editar' ? p.painel.registro.ID_Categoria : p.painel.modo}
        estado={p.painel}
        aoFechar={p.fechar}
        aoExcluir={permissao.excluir ? p.pedirExclusao : undefined}
      />

      <ConfirmarExclusao
        aberto={p.excluindo !== null}
        aoFechar={p.cancelarExclusao}
        titulo="Excluir categoria?"
        texto={
          p.excluindo && p.excluindo.totalSaidas > 0 ? (
            <>
              <strong>{p.excluindo.Nome_Categoria}</strong> já tem{' '}
              <span className="numero">{p.excluindo.totalSaidas}</span> lançamento(s) e o sistema não
              vai deixar excluir. Prefira marcar como <strong>Inativo</strong>.
            </>
          ) : (
            <>
              <strong>{p.excluindo?.Nome_Categoria}</strong> será apagada de vez.
            </>
          )
        }
        aoConfirmar={async () => {
          if (!p.excluindo) return false
          try {
            await excluir.mutateAsync(p.excluindo.ID_Categoria)
            toast.success('Categoria excluída.')
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
  nome: z.string().trim().min(2, 'Informe o nome da categoria.'),
  grupo: z.string().min(1, 'Escolha o grupo do DRE.'),
  tipo: z.string().min(1, 'Escolha o tipo de custo.'),
  impacta: z.string().min(1),
  status: z.string().min(1),
})
type Dados = z.infer<typeof esquema>

function FormCategoria({
  estado,
  aoFechar,
  aoExcluir,
}: {
  estado: EstadoPainel<CategoriaLista>
  aoFechar: () => void
  aoExcluir?: (c: CategoriaLista) => void
}) {
  const salvar = useSalvarCategoria()
  const registro = estado.modo === 'editar' ? estado.registro : null
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: registro?.Nome_Categoria ?? '',
      grupo: registro?.Grupo_DRE ?? '',
      tipo: registro?.Tipo_Custo ?? '',
      impacta: registro?.Impacta_Obra ?? 'Sim',
      status: registro?.Status ?? 'Ativo',
    },
  })

  async function enviar(d: Dados) {
    try {
      await salvar.mutateAsync({
        id: registro?.ID_Categoria,
        dados: {
          Nome_Categoria: limpar(d.nome),
          Grupo_DRE: d.grupo,
          Tipo_Custo: d.tipo,
          Impacta_Obra: d.impacta,
          Status: d.status,
        },
      })
      toast.success(registro ? 'Categoria atualizada.' : 'Categoria cadastrada.')
      aoFechar()
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  return (
    <PainelFormulario
      aberto={estado.modo !== 'fechado'}
      aoFechar={aoFechar}
      titulo={registro ? 'Editar categoria' : 'Nova categoria'}
      idFormulario="form-categoria"
      salvando={salvar.isPending}
      rotuloSalvar={registro ? 'Salvar' : 'Cadastrar'}
      aoExcluir={registro && aoExcluir ? () => aoExcluir(registro) : undefined}
    >
      <form id="form-categoria" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Nome" erro={errors.nome?.message} ajuda="Ex.: Material de construção, Frete, Aluguel de equipamento">
          {(a11y) => <Input {...a11y} {...register('nome')} autoComplete="off" autoFocus />}
        </Campo>
        <Campo rotulo="Grupo no DRE" erro={errors.grupo?.message}>
          {(a11y) => (
            <SelectNativo
              {...a11y}
              {...register('grupo')}
              vazio="Escolha o grupo"
              opcoes={comValorAtual(GRUPOS_DRE, registro?.Grupo_DRE)}
            />
          )}
        </Campo>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Tipo de custo" erro={errors.tipo?.message}>
            {(a11y) => (
              <SelectNativo
                {...a11y}
                {...register('tipo')}
                vazio="Escolha"
                opcoes={comValorAtual(TIPOS_CUSTO, registro?.Tipo_Custo)}
              />
            )}
          </Campo>
          <Campo rotulo="Entra no custo da obra?">
            {(a11y) => (
              <SelectNativo {...a11y} {...register('impacta')} opcoes={comValorAtual(SIM_NAO, registro?.Impacta_Obra)} />
            )}
          </Campo>
        </div>
        {registro && (
          <Campo rotulo="Status" ajuda="Inativa não aparece para novos lançamentos.">
            {(a11y) => (
              <SelectNativo {...a11y} {...register('status')} opcoes={comValorAtual(STATUS_CADASTRO, registro.Status)} />
            )}
          </Campo>
        )}
      </form>
    </PainelFormulario>
  )
}
