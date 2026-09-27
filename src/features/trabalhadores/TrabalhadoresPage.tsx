import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronRight, Copy, HardHat } from 'lucide-react'
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
import { CampoMoeda, InputSugestoes, SelectNativo } from '@/components/campos'
import { Moeda } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { usePermissao } from '@/hooks/use-permissao'
import { FUNCOES_SUGERIDAS, STATUS_CADASTRO, VINCULOS, comValorAtual } from '@/lib/opcoes'
import type { Trabalhador } from '@/types/app'
import { mensagemDeErro } from '@/utils/erros'
import { contem, limpar } from '@/utils/texto'
import { useExcluirTrabalhador, useSalvarTrabalhador, useTrabalhadores } from './api'

type Filtro = 'Ativo' | 'Inativo' | 'todos'

export function TrabalhadoresPage() {
  const consulta = useTrabalhadores()
  const permissao = usePermissao('trabalhadores')
  const p = usePainel<Trabalhador>()
  const excluir = useExcluirTrabalhador()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('Ativo')

  const todos = useMemo(() => consulta.data ?? [], [consulta.data])
  const visiveis = useMemo(
    () =>
      todos.filter(
        (t) =>
          (filtro === 'todos' || (t.Status ?? 'Ativo') === filtro) &&
          contem(busca, t.Nome_Trabalhador, t.Funcao, t.Tipo_Vinc_Contrato),
      ),
    [todos, filtro, busca],
  )
  const contar = (s: string) => todos.filter((t) => (t.Status ?? 'Ativo') === s).length
  // funções já usadas pela empresa entram nas sugestões
  const funcoes = useMemo(
    () => [...new Set([...FUNCOES_SUGERIDAS, ...todos.map((t) => t.Funcao).filter((f): f is string => !!f)])],
    [todos],
  )

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Trabalhadores"
        descricao="Equipe, diárias e chave PIX para pagamento."
        rotuloNovo="Novo trabalhador"
        aoCriar={permissao.criar ? p.novo : undefined}
      />

      <BarraFiltros
        busca={busca}
        aoBuscar={setBusca}
        placeholder="Buscar por nome ou função"
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
          icone={HardHat}
          titulo="Nenhum trabalhador cadastrado"
          texto="Cadastre a equipe para lançar diárias e pagamentos de mão de obra."
          filtrando={todos.length > 0}
          aoLimpar={() => {
            setBusca('')
            setFiltro('todos')
          }}
          acao={permissao.criar && <Button onClick={p.novo}>Cadastrar trabalhador</Button>}
        />
      ) : (
        <ul className="grid gap-2" aria-label="Trabalhadores">
          {visiveis.map((t) => (
            <li key={t.ID_Trabalhador} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => permissao.editar && p.editar(t)}
                disabled={!permissao.editar}
                className="group flex min-h-18 min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-xl border bg-card px-4 py-3 text-left transition-colors duration-150 hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">
                    {t.Nome_Trabalhador ?? 'Sem nome'}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[t.Funcao, t.Tipo_Vinc_Contrato].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block text-xs text-muted-foreground">Diária</span>
                  <Moeda valor={t.Valor_Diaria_Padrao} className="font-semibold" />
                </span>
                <SeloStatus status={t.Status} />
                {permissao.editar && (
                  <ChevronRight
                    className="hidden size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
                    aria-hidden="true"
                  />
                )}
              </button>
              {t.Chave_PIX && <CopiarPix chave={t.Chave_PIX} nome={t.Nome_Trabalhador} />}
            </li>
          ))}
        </ul>
      )}

      <FormTrabalhador
        key={p.painel.modo === 'editar' ? p.painel.registro.ID_Trabalhador : p.painel.modo}
        estado={p.painel}
        funcoes={funcoes}
        aoFechar={p.fechar}
        aoExcluir={permissao.excluir ? p.pedirExclusao : undefined}
      />

      <ConfirmarExclusao
        aberto={p.excluindo !== null}
        aoFechar={p.cancelarExclusao}
        titulo="Excluir trabalhador?"
        texto={
          <>
            <strong>{p.excluindo?.Nome_Trabalhador}</strong> será apagado de vez. Se já houver
            pagamentos para ele, o sistema não deixa excluir — marque como <strong>Inativo</strong>.
          </>
        }
        aoConfirmar={async () => {
          if (!p.excluindo) return false
          try {
            await excluir.mutateAsync(p.excluindo.ID_Trabalhador)
            toast.success('Trabalhador excluído.')
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

function CopiarPix({ chave, nome }: { chave: string; nome: string | null }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <Button
      variant="outline"
      className="h-auto min-h-18 flex-col gap-1 px-3 text-xs"
      aria-label={`Copiar chave PIX de ${nome ?? 'trabalhador'}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(chave)
          setCopiado(true)
          toast.success('Chave PIX copiada.')
          setTimeout(() => setCopiado(false), 2000)
        } catch {
          toast.error(`Não foi possível copiar. Chave: ${chave}`)
        }
      }}
    >
      {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      PIX
    </Button>
  )
}

/* ---------------- Formulário ---------------- */

const esquema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.'),
  funcao: z.string(),
  vinculo: z.string(),
  diaria: z.number().nonnegative().nullable(),
  pix: z.string(),
  status: z.string().min(1),
})
type Dados = z.infer<typeof esquema>

function FormTrabalhador({
  estado,
  funcoes,
  aoFechar,
  aoExcluir,
}: {
  estado: EstadoPainel<Trabalhador>
  funcoes: readonly string[]
  aoFechar: () => void
  aoExcluir?: (t: Trabalhador) => void
}) {
  const salvar = useSalvarTrabalhador()
  const registro = estado.modo === 'editar' ? estado.registro : null
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: registro?.Nome_Trabalhador ?? '',
      funcao: registro?.Funcao ?? '',
      vinculo: registro?.Tipo_Vinc_Contrato ?? 'Diarista',
      diaria: registro?.Valor_Diaria_Padrao ?? null,
      pix: registro?.Chave_PIX ?? '',
      status: registro?.Status ?? 'Ativo',
    },
  })

  async function enviar(d: Dados) {
    try {
      await salvar.mutateAsync({
        id: registro?.ID_Trabalhador,
        dados: {
          Nome_Trabalhador: limpar(d.nome),
          Funcao: limpar(d.funcao),
          Tipo_Vinc_Contrato: limpar(d.vinculo),
          Valor_Diaria_Padrao: d.diaria,
          Chave_PIX: limpar(d.pix),
          Status: d.status,
        },
      })
      toast.success(registro ? 'Trabalhador atualizado.' : 'Trabalhador cadastrado.')
      aoFechar()
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  return (
    <PainelFormulario
      aberto={estado.modo !== 'fechado'}
      aoFechar={aoFechar}
      titulo={registro ? 'Editar trabalhador' : 'Novo trabalhador'}
      idFormulario="form-trabalhador"
      salvando={salvar.isPending}
      rotuloSalvar={registro ? 'Salvar' : 'Cadastrar'}
      aoExcluir={registro && aoExcluir ? () => aoExcluir(registro) : undefined}
    >
      <form id="form-trabalhador" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Nome" erro={errors.nome?.message}>
          {(a11y) => <Input {...a11y} {...register('nome')} autoComplete="off" autoFocus />}
        </Campo>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Função" erro={errors.funcao?.message}>
            {(a11y) => <InputSugestoes {...a11y} {...register('funcao')} sugestoes={funcoes} placeholder="Ex.: Pedreiro" />}
          </Campo>
          <Campo rotulo="Vínculo">
            {(a11y) => (
              <SelectNativo
                {...a11y}
                {...register('vinculo')}
                opcoes={comValorAtual(VINCULOS, registro?.Tipo_Vinc_Contrato)}
              />
            )}
          </Campo>
        </div>
        <Campo
          rotulo="Diária padrão"
          erro={errors.diaria?.message}
          ajuda="Sugerida ao lançar pagamento; pode ser trocada em cada lançamento."
        >
          {(a11y) => (
            <Controller
              control={control}
              name="diaria"
              render={({ field }) => (
                <CampoMoeda {...a11y} name={field.name} onBlur={field.onBlur} ref={field.ref} value={field.value} onChange={field.onChange} />
              )}
            />
          )}
        </Campo>
        <Campo rotulo="Chave PIX" erro={errors.pix?.message} ajuda="CPF, telefone, e-mail ou chave aleatória.">
          {(a11y) => <Input {...a11y} {...register('pix')} autoComplete="off" autoCapitalize="none" spellCheck={false} />}
        </Campo>
        {registro && (
          <Campo rotulo="Status" ajuda="Inativo não aparece para novos pagamentos, mas mantém o histórico.">
            {(a11y) => (
              <SelectNativo {...a11y} {...register('status')} opcoes={comValorAtual(STATUS_CADASTRO, registro.Status)} />
            )}
          </Campo>
        )}
      </form>
    </PainelFormulario>
  )
}
