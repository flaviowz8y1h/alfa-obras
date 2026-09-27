import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Perfil = 'owner' | 'admin' | 'operacional'
export type StatusUsuario = 'Ativo' | 'Inativo'

export type Usuario = Omit<Tables<'dUsuarios'>, 'Perfil' | 'Status'> & {
  Perfil: Perfil
  Status: StatusUsuario
}

export type ResumoObra = Tables<'vw_resumo_obras'>
export type Cliente = Tables<'dClientes'>
export type Obra = Tables<'dObras'>
export type Trabalhador = Tables<'dTrabalhadores'>
export type Categoria = Tables<'dCategoriaGastos'>

type TabelaPublica = keyof Database['public']['Tables']

/** ID gerado pelo trigger gerar_id em cada tabela. */
type IdProprio = {
  dCategoriaGastos: 'ID_Categoria'
  dClientes: 'ID_Cliente'
  dEmpresas: 'ID_Empresa'
  dObras: 'ID_Obra'
  dTrabalhadores: 'ID_Trabalhador'
  dUsuarios: never
  fPagamentosMaoDeObra: 'ID_Pagamento'
  fRecebimentosObras: 'ID_Recebimento'
  fSaidasObras: 'ID_Saida'
}

/** Preenchidos pelo trigger set_audit_fields. */
type Auditoria = 'Criado_Em' | 'Criado_Por' | 'Atualizado_Em' | 'Atualizado_Por'

/** Payload de insert: sem o ID da própria tabela e sem auditoria. */
export type NovoRegistro<T extends TabelaPublica> = Omit<TablesInsert<T>, IdProprio[T] | Auditoria>

/** Payload de update: também não troca de empresa. */
export type Alteracao<T extends TabelaPublica> = Omit<
  TablesUpdate<T>,
  IdProprio[T] | Auditoria | 'ID_Empresa'
>

/**
 * Os tipos gerados marcam ID_* como obrigatório no Insert (a coluna não tem default;
 * quem preenche é o trigger gerar_id). Este cast documenta isso num lugar só.
 */
export function paraInsert<T extends TabelaPublica>(registro: NovoRegistro<T>): TablesInsert<T> {
  return registro as unknown as TablesInsert<T>
}

export const PERFIL_ROTULO: Record<Perfil, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  operacional: 'Operacional',
}
