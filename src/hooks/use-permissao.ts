import { useUsuarioLogado } from '@/features/auth/auth-context'
import { type Recurso, pode } from '@/lib/permissoes'

export function usePermissao(recurso: Recurso) {
  const { perfil } = useUsuarioLogado()
  return {
    criar: pode(perfil, 'criar', recurso),
    editar: pode(perfil, 'editar', recurso),
    excluir: pode(perfil, 'excluir', recurso),
  }
}
