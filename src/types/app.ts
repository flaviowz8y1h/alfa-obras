import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Perfil = 'owner' | 'admin' | 'operacional'
export type StatusUsuario = 'Ativo' | 'Inativo'

export type Usuario = Omit<Tables<'dUsuarios'>, 'Perfil' | 'Status'> & {
  Perfil: Perfil
  Status: StatusUsuario
}

export type ResumoObra = Tables<'vw_resumo_obras'>

type TabelaPublica = keyof import('@/types/database').Database['public']['Tables']

/** Campos que o banco preenche sozinho (trigger gerar_id + set_audit_fields). */
type CamposGerados =
  | `ID_${'Categoria' | 'Cliente' | 'Empresa' | 'Obra' | 'Trabalhador' | 'Usuario' | 'Pagamento' | 'Recebimento' | 'Saida'}`
  | 'Criado_Em'
  | 'Criado_Por'
  | 'Atualizado_Em'
  | 'Atualizado_Por'

/**
 * Payload de insert sem o ID da própria tabela e sem campos de auditoria.
 * Chaves estrangeiras (ex.: ID_Obra em fSaidasObras) voltam via `Chaves`.
 */
export type NovoRegistro<
  T extends TabelaPublica,
  Chaves extends keyof TablesInsert<T> = never,
> = Omit<TablesInsert<T>, CamposGerados> & Pick<TablesInsert<T>, Chaves>

export type Alteracao<T extends TabelaPublica> = Omit<TablesUpdate<T>, CamposGerados>

export const PERFIL_ROTULO: Record<Perfil, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  operacional: 'Operacional',
}
