import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Perfil, Usuario } from '@/types/app'

export type EstadoAuth =
  | { status: 'carregando' }
  | { status: 'deslogado' }
  | { status: 'erro'; mensagem: string }
  /** Tem fator TOTP verificado, mas a sessão ainda está em aal1. */
  | { status: 'mfa_verificacao'; session: Session }
  /** Owner (ou perfil ainda invisível por RLS) sem fator cadastrado. */
  | { status: 'mfa_cadastro'; session: Session }
  | { status: 'pronto'; session: Session; usuario: Usuario; nomeEmpresa: string }

export type AuthContexto = {
  estado: EstadoAuth
  /** Aviso a mostrar na tela de login (ex.: usuário inativo). */
  aviso: string | null
  limparAviso: () => void
  sair: () => Promise<void>
  recarregar: () => void
}

export const AuthContext = createContext<AuthContexto | null>(null)

export function useAuth(): AuthContexto {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

/** Só use dentro de rotas protegidas por <RequireAuth>. */
export function useUsuarioLogado(): {
  usuario: Usuario
  perfil: Perfil
  idEmpresa: string
  nomeEmpresa: string
  email: string
} {
  const { estado } = useAuth()
  if (estado.status !== 'pronto') {
    throw new Error('useUsuarioLogado usado fora de rota autenticada')
  }
  return {
    usuario: estado.usuario,
    perfil: estado.usuario.Perfil,
    idEmpresa: estado.usuario.ID_Empresa,
    nomeEmpresa: estado.nomeEmpresa,
    email: estado.session.user.email ?? '',
  }
}
