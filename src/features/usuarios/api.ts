import { FunctionsHttpError } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUsuarioLogado } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/types/app'

/*
 * Tudo passa pela Edge Function `gerenciar-usuarios` (supabase/functions):
 * criar login exige a service_role, que nunca vem para o navegador.
 */

export type UsuarioEmpresa = {
  id: string
  nome: string | null
  perfil: Perfil
  status: 'Ativo' | 'Inativo'
  criadoEm: string
  email: string | null
  ultimoAcesso: string | null
  temMfa: boolean
  souEu: boolean
}

type Acao =
  | { acao: 'listar' }
  | { acao: 'criar'; nome: string; email: string; perfil: Perfil; senha: string }
  | { acao: 'atualizar'; id: string; nome?: string; perfil?: Perfil; status?: 'Ativo' | 'Inativo' }
  | { acao: 'redefinir_senha'; id: string; senha: string }

/** Erro já com mensagem em pt-BR vinda da função (mensagemDeErro repassa pelo code). */
export class ErroFuncao extends Error {
  code = 'FUNCAO'
}

async function chamar<T>(corpo: Acao): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('gerenciar-usuarios', { body: corpo })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const detalhe = (await error.context.json().catch(() => null)) as { erro?: string } | null
      throw new ErroFuncao(detalhe?.erro ?? 'Não foi possível concluir. Tente de novo.')
    }
    throw new ErroFuncao('Sem conexão com o servidor. Verifique a internet e tente de novo.')
  }
  return data as T
}

export function useUsuariosEmpresa() {
  const { idEmpresa } = useUsuarioLogado()
  return useQuery({
    queryKey: ['dUsuarios', idEmpresa, 'gestao'],
    queryFn: async () => (await chamar<{ usuarios: UsuarioEmpresa[] }>({ acao: 'listar' })).usuarios,
    retry: false,
  })
}

export function useAcaoUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (corpo: Exclude<Acao, { acao: 'listar' }>) => chamar<unknown>(corpo),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['dUsuarios'] }),
  })
}

/**
 * Senha inicial legível: 12 caracteres, sem letras/números ambíguos (0/O, 1/l/I).
 * Segue a regra de senha do Supabase Auth: minúscula, maiúscula, número e símbolo.
 */
export function gerarSenha(): string {
  const minusculas = 'abcdefghjkmnpqrstuvwxyz'
  const maiusculas = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const digitos = '23456789'
  const simbolos = '!@#$%&*?'
  const todos = minusculas + maiusculas + digitos + simbolos
  const aleatorio = new Uint32Array(24)
  crypto.getRandomValues(aleatorio)
  const sorteia = (de: string, i: number) => de[aleatorio[i]! % de.length]!
  // uma de cada grupo obrigatório + o resto de qualquer grupo
  const chars = [sorteia(minusculas, 0), sorteia(maiusculas, 1), sorteia(digitos, 2), sorteia(simbolos, 3)]
  for (let i = 4; i < 12; i++) chars.push(sorteia(todos, i))
  // embaralha para os obrigatórios não ficarem sempre no começo
  for (let i = chars.length - 1; i > 0; i--) {
    const j = aleatorio[12 + i]! % (i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
  return chars.join('')
}
