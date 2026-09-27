import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Perfil, Usuario } from '@/types/app'
import { mensagemDeErro } from '@/utils/erros'
import { AuthContext, type EstadoAuth } from './auth-context'

const PERFIS: readonly Perfil[] = ['owner', 'admin', 'operacional']

type Resolucao = { estado: EstadoAuth; aviso?: string }

/**
 * Decide em que etapa do login a sessão está.
 *
 * Atenção: a policy restritiva `owner_mfa_ok` esconde de um owner em aal1 até a
 * própria linha de dUsuarios. Por isso a checagem de AAL vem antes da consulta
 * ao perfil, e "sem perfil em aal1" é tratado como owner que precisa cadastrar MFA.
 */
async function resolverSessao(session: Session | null): Promise<Resolucao> {
  if (!session) return { estado: { status: 'deslogado' } }

  const { data: aal, error: erroAal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (erroAal) throw erroAal

  const emAal2 = aal.currentLevel === 'aal2'
  if (aal.nextLevel === 'aal2' && !emAal2) {
    return { estado: { status: 'mfa_verificacao', session } }
  }

  const { data: linha, error: erroPerfil } = await supabase
    .from('dUsuarios')
    .select('*')
    .eq('ID_Usuario', session.user.id)
    .maybeSingle()
  if (erroPerfil) throw erroPerfil

  if (!linha) {
    if (!emAal2) return { estado: { status: 'mfa_cadastro', session } }
    await supabase.auth.signOut({ scope: 'local' })
    return {
      estado: { status: 'deslogado' },
      aviso: 'Seu acesso ainda não foi configurado. Fale com o proprietário da empresa.',
    }
  }

  if (linha.Status === 'Inativo') {
    await supabase.auth.signOut({ scope: 'local' })
    return {
      estado: { status: 'deslogado' },
      aviso: 'Seu usuário está inativo. Fale com o proprietário da empresa para reativar.',
    }
  }

  if (!PERFIS.includes(linha.Perfil as Perfil)) {
    await supabase.auth.signOut({ scope: 'local' })
    return {
      estado: { status: 'deslogado' },
      aviso: 'Perfil de acesso inválido. Fale com o proprietário da empresa.',
    }
  }

  const usuario = linha as Usuario
  if (usuario.Perfil === 'owner' && !emAal2) {
    return { estado: { status: 'mfa_cadastro', session } }
  }

  const { data: empresa } = await supabase
    .from('dEmpresas')
    .select('Nome_Empresa')
    .eq('ID_Empresa', usuario.ID_Empresa)
    .maybeSingle()

  return {
    estado: {
      status: 'pronto',
      session,
      usuario,
      nomeEmpresa: empresa?.Nome_Empresa ?? 'Minha empresa',
    },
  }
}

/** Eventos que mudam quem está logado ou o nível de garantia (AAL). */
const EVENTOS_QUE_RESOLVEM: ReadonlySet<AuthChangeEvent> = new Set([
  'INITIAL_SESSION',
  'SIGNED_IN',
  'SIGNED_OUT',
  'MFA_CHALLENGE_VERIFIED',
  'USER_UPDATED',
])

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<EstadoAuth>({ status: 'carregando' })
  const [aviso, setAviso] = useState<string | null>(null)
  const ultimaExecucao = useRef(0)
  const sessaoAtual = useRef<Session | null>(null)

  const resolver = useCallback((session: Session | null, mostrarCarregando: boolean) => {
    const execucao = ++ultimaExecucao.current
    if (mostrarCarregando) setEstado({ status: 'carregando' })
    // setTimeout: o supabase-js não permite await de outras chamadas dentro do onAuthStateChange
    setTimeout(() => {
      resolverSessao(session)
        .then(({ estado: novo, aviso: novoAviso }) => {
          if (execucao !== ultimaExecucao.current) return
          if (novoAviso) setAviso(novoAviso)
          setEstado(novo)
        })
        .catch((erro: unknown) => {
          if (execucao !== ultimaExecucao.current) return
          setEstado({ status: 'erro', mensagem: mensagemDeErro(erro) })
        })
    }, 0)
  }, [])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, session) => {
      sessaoAtual.current = session
      if (evento === 'SIGNED_OUT') queryClient.clear()
      if (!EVENTOS_QUE_RESOLVEM.has(evento)) return
      // USER_UPDATED (ex.: troca de senha) não precisa piscar a tela de carregamento
      resolver(session, evento !== 'USER_UPDATED')
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient, resolver])

  const sair = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' })
  }, [])

  const recarregar = useCallback(() => resolver(sessaoAtual.current, true), [resolver])
  const limparAviso = useCallback(() => setAviso(null), [])

  const valor = useMemo(
    () => ({ estado, aviso, limparAviso, sair, recarregar }),
    [estado, aviso, limparAviso, sair, recarregar],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
