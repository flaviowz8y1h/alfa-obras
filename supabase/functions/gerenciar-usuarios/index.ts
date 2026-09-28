// Gestão de usuários da empresa — só o owner (ativo e com MFA/aal2) pode chamar.
// Usa a service_role, que existe apenas aqui no servidor (variável automática do Supabase).
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PERFIS_GERENCIAVEIS = ['admin', 'operacional'] as const
type PerfilGerenciavel = (typeof PERFIS_GERENCIAVEIS)[number]

class ErroHttp extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function lerClaims(token: string): Record<string, unknown> {
  const parte = token.split('.')[1] ?? ''
  const json = atob(parte.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(json)
}

function validarSenha(senha: unknown): string {
  if (typeof senha !== 'string' || senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    throw new ErroHttp(400, 'A senha precisa ter pelo menos 8 caracteres, com letras e números.')
  }
  return senha
}

function validarPerfil(perfil: unknown): PerfilGerenciavel {
  if (!PERFIS_GERENCIAVEIS.includes(perfil as PerfilGerenciavel)) {
    throw new ErroHttp(400, 'Perfil inválido. Use Administrador ou Operacional.')
  }
  return perfil as PerfilGerenciavel
}

function validarNome(nome: unknown): string {
  const n = typeof nome === 'string' ? nome.replace(/\s+/g, ' ').trim() : ''
  if (n.length < 2) throw new ErroHttp(400, 'Informe o nome.')
  return n
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405)

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    /* ---------- Quem está chamando? ---------- */
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    const { data: auth, error: erroAuth } = await admin.auth.getUser(token)
    if (erroAuth || !auth.user) throw new ErroHttp(401, 'Sessão inválida. Entre novamente.')

    // getUser já validou o token no servidor de Auth; aqui só lemos o nível de garantia.
    if (lerClaims(token).aal !== 'aal2') {
      throw new ErroHttp(403, 'Confirme a verificação em duas etapas para gerenciar usuários.')
    }

    const { data: chamador } = await admin
      .from('dUsuarios')
      .select('ID_Usuario, ID_Empresa, Perfil, Status')
      .eq('ID_Usuario', auth.user.id)
      .maybeSingle()
    if (!chamador || chamador.Status !== 'Ativo' || chamador.Perfil !== 'owner') {
      throw new ErroHttp(403, 'Só o proprietário da conta pode gerenciar usuários.')
    }
    const idEmpresa = chamador.ID_Empresa

    /** Garante que o alvo é da mesma empresa, não é owner e não é quem chama. */
    async function alvoGerenciavel(id: unknown) {
      if (typeof id !== 'string' || !id) throw new ErroHttp(400, 'Usuário não informado.')
      if (id === chamador!.ID_Usuario) throw new ErroHttp(400, 'Você não pode alterar a própria conta por aqui.')
      const { data } = await admin.from('dUsuarios').select('*').eq('ID_Usuario', id).maybeSingle()
      if (!data || data.ID_Empresa !== idEmpresa) throw new ErroHttp(404, 'Usuário não encontrado.')
      if (data.Perfil === 'owner') throw new ErroHttp(403, 'O proprietário não pode ser alterado por aqui.')
      return data
    }

    const corpo = await req.json().catch(() => ({}))

    switch (corpo.acao) {
      /* ---------- Listar ---------- */
      case 'listar': {
        const { data: linhas, error } = await admin
          .from('dUsuarios')
          .select('ID_Usuario, Nome, Perfil, Status, Criado_Em')
          .eq('ID_Empresa', idEmpresa)
          .order('Nome')
        if (error) throw error
        const usuarios = await Promise.all(
          linhas.map(async (u) => {
            const { data } = await admin.auth.admin.getUserById(u.ID_Usuario)
            const conta = data?.user
            return {
              id: u.ID_Usuario,
              nome: u.Nome,
              perfil: u.Perfil,
              status: u.Status,
              criadoEm: u.Criado_Em,
              email: conta?.email ?? null,
              ultimoAcesso: conta?.last_sign_in_at ?? null,
              temMfa: (conta?.factors ?? []).some((f) => f.status === 'verified'),
              souEu: u.ID_Usuario === chamador.ID_Usuario,
            }
          }),
        )
        return resposta({ usuarios })
      }

      /* ---------- Criar ---------- */
      case 'criar': {
        const nome = validarNome(corpo.nome)
        const perfil = validarPerfil(corpo.perfil)
        const senha = validarSenha(corpo.senha)
        const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : ''
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, 'Informe um e-mail válido.')

        const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
          user_metadata: { nome },
        })
        if (erroCriar || !criado.user) {
          const jaExiste = erroCriar?.code === 'email_exists' || /already/i.test(erroCriar?.message ?? '')
          throw new ErroHttp(400, jaExiste ? 'Já existe um usuário com este e-mail.' : 'Não foi possível criar o login.')
        }

        const { error: erroPerfil } = await admin.from('dUsuarios').insert({
          ID_Usuario: criado.user.id,
          ID_Empresa: idEmpresa,
          Nome: nome,
          Perfil: perfil,
          Status: 'Ativo',
        })
        if (erroPerfil) {
          // desfaz o login para não sobrar conta sem perfil
          await admin.auth.admin.deleteUser(criado.user.id)
          throw new ErroHttp(500, 'Não foi possível salvar o perfil do usuário. Nada foi criado.')
        }
        return resposta({ id: criado.user.id }, 201)
      }

      /* ---------- Atualizar nome / perfil / status ---------- */
      case 'atualizar': {
        const alvo = await alvoGerenciavel(corpo.id)
        const mudancas: Record<string, string> = {}
        if (corpo.nome !== undefined) mudancas.Nome = validarNome(corpo.nome)
        if (corpo.perfil !== undefined) mudancas.Perfil = validarPerfil(corpo.perfil)
        if (corpo.status !== undefined) {
          if (corpo.status !== 'Ativo' && corpo.status !== 'Inativo') throw new ErroHttp(400, 'Status inválido.')
          mudancas.Status = corpo.status
        }
        if (Object.keys(mudancas).length === 0) throw new ErroHttp(400, 'Nada para alterar.')

        const { error } = await admin
          .from('dUsuarios')
          .update({ ...mudancas, Atualizado_Em: new Date().toISOString() })
          .eq('ID_Usuario', alvo.ID_Usuario)
        if (error) throw error

        // Inativo também não consegue mais entrar (e as sessões abertas param de renovar).
        if (mudancas.Status) {
          await admin.auth.admin.updateUserById(alvo.ID_Usuario, {
            ban_duration: mudancas.Status === 'Inativo' ? '876000h' : 'none',
          })
        }
        return resposta({ ok: true })
      }

      /* ---------- Redefinir senha ---------- */
      case 'redefinir_senha': {
        const alvo = await alvoGerenciavel(corpo.id)
        const senha = validarSenha(corpo.senha)
        const { error } = await admin.auth.admin.updateUserById(alvo.ID_Usuario, { password: senha })
        if (error) throw new ErroHttp(400, 'Não foi possível trocar a senha. Tente outra.')
        return resposta({ ok: true })
      }

      default:
        throw new ErroHttp(400, 'Ação desconhecida.')
    }
  } catch (e) {
    if (e instanceof ErroHttp) return resposta({ erro: e.message }, e.status)
    console.error(e)
    return resposta({ erro: 'Erro inesperado no servidor. Tente de novo.' }, 500)
  }
})
