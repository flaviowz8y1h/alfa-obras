import type { Perfil } from '@/types/app'

/**
 * Espelho das policies de RLS, só para esconder o que o perfil não pode fazer.
 * A barreira real continua sendo o banco.
 */
export type Recurso = 'clientes' | 'obras' | 'trabalhadores' | 'categorias' | 'lancamentos' | 'locacoes'
export type Acao = 'criar' | 'editar' | 'excluir'

const REGRAS: Record<Recurso, Record<Acao, readonly Perfil[]>> = {
  clientes: { criar: ['owner', 'admin', 'operacional'], editar: ['owner', 'admin', 'operacional'], excluir: ['owner'] },
  obras: { criar: ['owner', 'admin', 'operacional'], editar: ['owner', 'admin', 'operacional'], excluir: ['owner'] },
  trabalhadores: { criar: ['owner', 'admin', 'operacional'], editar: ['owner', 'admin', 'operacional'], excluir: ['owner'] },
  categorias: { criar: ['owner', 'admin'], editar: ['owner', 'admin'], excluir: ['owner'] },
  // saídas, recebimentos e mão de obra têm as mesmas policies
  lancamentos: { criar: ['owner', 'admin', 'operacional'], editar: ['owner', 'admin', 'operacional'], excluir: ['owner'] },
  // quem está na obra marca "devolvi" e prorroga: todos editam qualquer locação da empresa
  locacoes: { criar: ['owner', 'admin', 'operacional'], editar: ['owner', 'admin', 'operacional'], excluir: ['owner'] },
}

export function pode(perfil: Perfil, acao: Acao, recurso: Recurso): boolean {
  return REGRAS[recurso][acao].includes(perfil)
}

/** Lançamentos: owner/admin editam qualquer um; operacional só os que ele mesmo criou (policy *_update). */
export function podeEditarLancamento(perfil: Perfil, idUsuario: string, criadoPor: string | null): boolean {
  if (!pode(perfil, 'editar', 'lancamentos')) return false
  return perfil !== 'operacional' || criadoPor === idUsuario
}
