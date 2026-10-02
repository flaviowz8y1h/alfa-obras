import { zodResolver } from '@hookform/resolvers/zod'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, ChevronRight, Copy, KeyRound, RefreshCw, ShieldCheck, ShieldOff, UserCog } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  CabecalhoCadastro,
  ListaCarregando,
  ListaErro,
  PainelFormulario,
  SeloStatus,
} from '@/components/cadastro'
import { Campo } from '@/components/campo'
import { SelectNativo } from '@/components/campos'
import { CartaoIndicador, FaixaIndicadores } from '@/components/painel'
import { Trena } from '@/components/valores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EscolhaOpcao } from '@/features/lancamentos/comum'
import { type EstadoPainel, usePainel } from '@/hooks/use-painel'
import { cn } from '@/lib/utils'
import { PERFIL_ROTULO, type Perfil } from '@/types/app'
import { mensagemDeErro } from '@/utils/erros'
import { type UsuarioEmpresa, gerarSenha, useAcaoUsuario, useUsuariosEmpresa } from './api'

const DESCRICAO_PERFIL: Record<Perfil, string> = {
  owner: 'Acesso total, inclusive excluir registros e gerenciar usuários.',
  admin: 'Cadastra e edita tudo, inclusive categorias. Não exclui nem gerencia usuários.',
  operacional: 'Lança saídas, recebimentos e mão de obra; cadastra obras, clientes e equipe.',
}

export function UsuariosPage() {
  const consulta = useUsuariosEmpresa()
  const p = usePainel<UsuarioEmpresa>()

  return (
    <div className="grid gap-6">
      <CabecalhoCadastro
        titulo="Usuários"
        descricao="Quem acessa o sistema e o que cada um pode fazer."
        rotuloNovo="Novo usuário"
        aoCriar={p.novo}
      />

      {consulta.data && consulta.data.length > 0 && <ResumoUsuarios usuarios={consulta.data} />}

      <dl className="grid gap-2 rounded-xl border bg-card p-4 text-sm sm:grid-cols-3">
        {(Object.keys(DESCRICAO_PERFIL) as Perfil[]).map((perfil) => (
          <div key={perfil}>
            <dt className="font-semibold">{PERFIL_ROTULO[perfil]}</dt>
            <dd className="text-muted-foreground">{DESCRICAO_PERFIL[perfil]}</dd>
          </div>
        ))}
      </dl>

      {consulta.isPending ? (
        <ListaCarregando />
      ) : consulta.isError ? (
        <ListaErro erro={consulta.error} aoTentar={() => void consulta.refetch()} />
      ) : (
        <ul className="grid gap-2" aria-label="Usuários">
          {consulta.data.map((u) => (
            <li key={u.id}>
              <LinhaUsuario u={u} aoAbrir={() => p.editar(u)} />
            </li>
          ))}
        </ul>
      )}

      <FormUsuario key={p.painel.modo === 'editar' ? p.painel.registro.id : p.painel.modo} estado={p.painel} aoFechar={p.fechar} />
    </div>
  )
}

function ResumoUsuarios({ usuarios }: { usuarios: readonly UsuarioEmpresa[] }) {
  const ativos = usuarios.filter((u) => u.status === 'Ativo')
  const comMfa = ativos.filter((u) => u.temMfa).length
  const nuncaEntraram = ativos.filter((u) => !u.ultimoAcesso).length
  const porPerfil = (Object.keys(PERFIL_ROTULO) as Perfil[])
    .map((p) => [PERFIL_ROTULO[p], ativos.filter((u) => u.perfil === p).length] as const)
    .filter(([, n]) => n > 0)
    .map(([r, n]) => `${n} ${r.toLowerCase()}`)
    .join(' · ')

  return (
    <FaixaIndicadores rotulo="Resumo dos acessos">
      <CartaoIndicador destaque rotulo="Usuários ativos" valor={ativos.length} detalhe={porPerfil || '—'} />
      <CartaoIndicador
        indice={1}
        rotulo="Verificação em 2 etapas"
        valor={`${comMfa} de ${ativos.length}`}
        detalhe={comMfa === ativos.length ? 'Todos os ativos protegidos' : 'Peça para ativarem no próximo acesso'}
      >
        <Trena parte={comMfa} total={ativos.length} rotulo="Usuários ativos com verificação em 2 etapas" cor="var(--positivo)" />
      </CartaoIndicador>
      <CartaoIndicador
        indice={2}
        rotulo="Nunca entraram"
        valor={<span className={cn(nuncaEntraram > 0 && 'text-aviso')}>{nuncaEntraram}</span>}
        detalhe="Ativos que ainda não fizeram o primeiro acesso"
      />
      <CartaoIndicador
        indice={3}
        rotulo="Inativos"
        valor={usuarios.length - ativos.length}
        detalhe="Sem acesso, histórico preservado"
      />
    </FaixaIndicadores>
  )
}

function LinhaUsuario({ u, aoAbrir }: { u: UsuarioEmpresa; aoAbrir: () => void }) {
  const editavel = !u.souEu && u.perfil !== 'owner'
  const conteudo = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-heading text-base font-bold text-secondary-foreground">
        {(u.nome ?? u.email ?? '?').trim().charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-base font-semibold">{u.nome ?? 'Sem nome'}</span>
          {u.souEu && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Você</span>}
        </span>
        <span className="block truncate text-sm text-muted-foreground">{u.email ?? '—'}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{PERFIL_ROTULO[u.perfil] ?? u.perfil}</span>
          <span>
            {u.ultimoAcesso
              ? `Último acesso ${formatDistanceToNow(parseISO(u.ultimoAcesso), { locale: ptBR, addSuffix: true })}`
              : 'Nunca entrou'}
          </span>
          <span className="inline-flex items-center gap-1">
            {u.temMfa ? (
              <ShieldCheck className="size-3.5 text-positivo" aria-hidden="true" />
            ) : (
              <ShieldOff className="size-3.5" aria-hidden="true" />
            )}
            {u.temMfa ? 'Com verificação em 2 etapas' : 'Sem verificação em 2 etapas'}
          </span>
        </span>
      </span>
      <SeloStatus status={u.status} />
      {editavel && <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  )

  const classe =
    'group flex min-h-20 w-full items-center gap-4 rounded-xl border bg-card px-4 py-3 text-left transition-colors duration-150'
  return editavel ? (
    <button
      type="button"
      onClick={aoAbrir}
      className={cn(
        classe,
        'cursor-pointer hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
      )}
    >
      {conteudo}
    </button>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}

/* ---------------- Formulário ---------------- */

const regraSenha = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres.')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra.')
  .regex(/\d/, 'Inclua pelo menos um número.')

const esquemaNovo = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.'),
  email: z.email('Informe um e-mail válido.'),
  perfil: z.enum(['admin', 'operacional']),
  senha: regraSenha,
})
const esquemaEdicao = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.'),
  perfil: z.enum(['admin', 'operacional']),
  status: z.enum(['Ativo', 'Inativo']),
})

const OPCOES_PERFIL = ['Operacional', 'Administrador'] as const
const paraPerfil = (rotulo: string): 'admin' | 'operacional' => (rotulo === 'Administrador' ? 'admin' : 'operacional')
const paraRotulo = (perfil: string) => (perfil === 'admin' ? 'Administrador' : 'Operacional')

function FormUsuario({ estado, aoFechar }: { estado: EstadoPainel<UsuarioEmpresa>; aoFechar: () => void }) {
  return estado.modo === 'editar' ? (
    <FormEdicao usuario={estado.registro} aoFechar={aoFechar} />
  ) : (
    <FormNovo aberto={estado.modo === 'novo'} aoFechar={aoFechar} />
  )
}

function FormNovo({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const acao = useAcaoUsuario()
  const [criado, setCriado] = useState<{ email: string; senha: string } | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof esquemaNovo>>({
    resolver: zodResolver(esquemaNovo),
    defaultValues: { nome: '', email: '', perfil: 'operacional', senha: gerarSenha() },
  })

  async function enviar(d: z.infer<typeof esquemaNovo>) {
    try {
      await acao.mutateAsync({ acao: 'criar', ...d, email: d.email.trim().toLowerCase() })
      setCriado({ email: d.email.trim().toLowerCase(), senha: d.senha })
      toast.success('Usuário criado.')
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  if (criado) {
    return (
      <PainelFormulario
        aberto={aberto}
        aoFechar={aoFechar}
        titulo="Usuário criado"
        descricao="Passe estes dados para a pessoa. Por segurança, a senha não aparece de novo depois."
        idFormulario="form-usuario-pronto"
        salvando={false}
        rotuloSalvar="Concluir"
      >
        <form id="form-usuario-pronto" onSubmit={(e) => (e.preventDefault(), aoFechar())} className="grid gap-4">
          <DadoCopiavel rotulo="E-mail" valor={criado.email} />
          <DadoCopiavel rotulo="Senha inicial" valor={criado.senha} />
          <p className="text-sm text-muted-foreground">
            Ela entra com esses dados e pode trocar a senha depois em “Esqueci a senha”.
          </p>
        </form>
      </PainelFormulario>
    )
  }

  return (
    <PainelFormulario
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo usuário"
      descricao="Cria o login e o perfil de acesso na sua empresa."
      idFormulario="form-usuario"
      salvando={acao.isPending}
      rotuloSalvar="Criar usuário"
    >
      <form id="form-usuario" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Nome" erro={errors.nome?.message}>
          {(a11y) => <Input {...a11y} {...register('nome')} autoComplete="off" autoFocus />}
        </Campo>
        <Campo rotulo="E-mail" erro={errors.email?.message} ajuda="Será o login da pessoa.">
          {(a11y) => (
            <Input {...a11y} {...register('email')} type="email" inputMode="email" autoCapitalize="none" autoComplete="off" />
          )}
        </Campo>
        <Campo rotulo="Perfil">
          {(a11y) => (
            <Controller
              control={control}
              name="perfil"
              render={({ field }) => (
                <div className="grid gap-2">
                  <EscolhaOpcao
                    {...a11y}
                    rotulo="Perfil"
                    opcoes={OPCOES_PERFIL}
                    value={paraRotulo(field.value)}
                    onChange={(v) => field.onChange(paraPerfil(v))}
                  />
                  <p className="text-sm text-muted-foreground">{DESCRICAO_PERFIL[field.value]}</p>
                </div>
              )}
            />
          )}
        </Campo>
        <Campo rotulo="Senha inicial" erro={errors.senha?.message} ajuda="Gerada automaticamente; você pode trocar.">
          {(a11y) => (
            <div className="flex gap-2">
              <Input {...a11y} {...register('senha')} autoComplete="new-password" className="numero font-mono" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setValue('senha', gerarSenha(), { shouldValidate: true })}
                aria-label="Gerar outra senha"
              >
                <RefreshCw aria-hidden="true" />
              </Button>
            </div>
          )}
        </Campo>
      </form>
    </PainelFormulario>
  )
}

function FormEdicao({ usuario, aoFechar }: { usuario: UsuarioEmpresa; aoFechar: () => void }) {
  const acao = useAcaoUsuario()
  const [novaSenha, setNovaSenha] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof esquemaEdicao>>({
    resolver: zodResolver(esquemaEdicao),
    defaultValues: {
      nome: usuario.nome ?? '',
      perfil: usuario.perfil === 'admin' ? 'admin' : 'operacional',
      status: usuario.status,
    },
  })

  async function enviar(d: z.infer<typeof esquemaEdicao>) {
    if (!isDirty) return aoFechar()
    try {
      await acao.mutateAsync({ acao: 'atualizar', id: usuario.id, ...d })
      toast.success(d.status === 'Inativo' && usuario.status === 'Ativo' ? 'Usuário inativado e bloqueado.' : 'Usuário atualizado.')
      aoFechar()
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  async function redefinir() {
    const senha = gerarSenha()
    try {
      await acao.mutateAsync({ acao: 'redefinir_senha', id: usuario.id, senha })
      setNovaSenha(senha)
      toast.success('Senha redefinida.')
    } catch (e) {
      toast.error(mensagemDeErro(e))
    }
  }

  return (
    <PainelFormulario
      aberto
      aoFechar={aoFechar}
      titulo="Editar usuário"
      descricao={usuario.email ?? undefined}
      idFormulario="form-usuario-edicao"
      salvando={acao.isPending}
    >
      <form id="form-usuario-edicao" onSubmit={handleSubmit(enviar)} className="grid gap-5" noValidate>
        <Campo rotulo="Nome" erro={errors.nome?.message}>
          {(a11y) => <Input {...a11y} {...register('nome')} autoComplete="off" />}
        </Campo>
        <Campo rotulo="Perfil">
          {(a11y) => (
            <Controller
              control={control}
              name="perfil"
              render={({ field }) => (
                <div className="grid gap-2">
                  <EscolhaOpcao
                    {...a11y}
                    rotulo="Perfil"
                    opcoes={OPCOES_PERFIL}
                    value={paraRotulo(field.value)}
                    onChange={(v) => field.onChange(paraPerfil(v))}
                  />
                  <p className="text-sm text-muted-foreground">{DESCRICAO_PERFIL[field.value]}</p>
                </div>
              )}
            />
          )}
        </Campo>
        <Campo rotulo="Status" ajuda="Inativo não consegue mais entrar. O histórico de lançamentos é mantido.">
          {(a11y) => <SelectNativo {...a11y} {...register('status')} opcoes={['Ativo', 'Inativo']} />}
        </Campo>

        <div className="grid gap-3 rounded-xl border p-4">
          <p className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4" aria-hidden="true" />
            Senha
          </p>
          {novaSenha ? (
            <>
              <DadoCopiavel rotulo="Nova senha" valor={novaSenha} />
              <p className="text-sm text-muted-foreground">Passe para a pessoa. Ela não aparece de novo depois.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Esqueceu a senha? Gere uma nova e passe para a pessoa.
              </p>
              <Button type="button" variant="outline" className="w-fit" onClick={() => void redefinir()} disabled={acao.isPending}>
                <UserCog aria-hidden="true" />
                Gerar nova senha
              </Button>
            </>
          )}
        </div>
      </form>
    </PainelFormulario>
  )
}

function DadoCopiavel({ rotulo, valor }: { rotulo: string; valor: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="truncate font-mono text-base font-medium select-all">{valor}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(valor)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
          } catch {
            toast.error('Não foi possível copiar. Selecione e copie manualmente.')
          }
        }}
      >
        {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copiado ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  )
}
