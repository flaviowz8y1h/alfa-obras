import type { Perfil } from '@/types/app'

/**
 * Espelho das policies de RLS, só para esconder o que o perfil não pode fazer.
 * A barreira real continua sendo o banco.
 */
export type Recurso = 'clientes' | 'obras' | 'trabalhadores' | 'categorias'
export type Acao = 'criar' | 'editar' | 'excluir'

const REGRAS: Record<Recurso, Record<Acao, readonly Perfil[]>> = {
  clientes: { criar: ['owner', 'admin', 'operacional'], editar: ['owner', 'admin', 'operacional'], excluir: ['owner'] },
  obras: { criar: ['owner', 'admin', 'operacional'], editar: ['owner', 'admin', 'operacional'], excluir: ['owner'] },
  trabalhadores: { criar: ['owner', 'admin', 'operacional'], editar: ['owner', 'admin', 'operacional'], excluir: ['owner'] },
  categorias: { criar: ['owner', 'admin'], editar: ['owner', 'admin'], excluir: ['owner'] },
}

export function pode(perfil: Perfil, acao: Acao, recurso: Recurso): boolean {
  return REGRAS[recurso][acao].includes(perfil)
}
