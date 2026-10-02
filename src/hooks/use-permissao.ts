import { useUsuarioLogado } from '@/features/auth/auth-context'
import { type Recurso, pode, podeEditarLancamento } from '@/lib/permissoes'

export function usePermissao(recurso: Recurso) {
  const { perfil } = useUsuarioLogado()
  return {
    criar: pode(perfil, 'criar', recurso),
    editar: pode(perfil, 'editar', recurso),
    excluir: pode(perfil, 'excluir', recurso),
  }
}

/** Se o usuário logado pode editar este lançamento (operacional: só os que ele criou). */
export function usePodeEditarLancamento(): (registro: { Criado_Por: string | null }) => boolean {
  const { perfil, usuario } = useUsuarioLogado()
  return (registro) => podeEditarLancamento(perfil, usuario.ID_Usuario, registro.Criado_Por)
}
