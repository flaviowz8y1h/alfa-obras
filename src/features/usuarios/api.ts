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

/** Senha inicial legível: 10 caracteres, sem letras/números ambíguos (0/O, 1/l/I). */
export function gerarSenha(): string {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'
  const digitos = '23456789'
  const todos = letras + digitos
  const aleatorio = new Uint32Array(10)
  crypto.getRandomValues(aleatorio)
  const chars = Array.from(aleatorio, (n) => todos[n % todos.length]!)
  // garante ao menos uma letra e um número (regra da senha)
  chars[0] = letras[aleatorio[0]! % letras.length]!
  chars[9] = digitos[aleatorio[9]! % digitos.length]!
  return chars.join('')
}
