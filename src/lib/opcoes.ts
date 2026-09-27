/*
 * Valores de domínio. O banco guarda texto livre (sem CHECK), então a lista vive aqui.
 * Valores antigos fora da lista continuam aparecendo nos selects (ver `comValorAtual`).
 */

export const STATUS_CADASTRO = ['Ativo', 'Inativo'] as const
export type StatusCadastro = (typeof STATUS_CADASTRO)[number]

export const STATUS_OBRA = ['Em Andamento', 'Pausada', 'Concluída', 'Cancelada'] as const

export const VINCULOS = ['Diarista', 'Autônomo', 'Empreiteiro', 'CLT'] as const

export const FUNCOES_SUGERIDAS = [
  'Mestre de Obras',
  'Pedreiro',
  'Servente',
  'Pintor',
  'Eletricista',
  'Encanador',
  'Carpinteiro',
  'Gesseiro',
  'Azulejista',
  'Assistente Administrativo-Financeira',
] as const

export const GRUPOS_DRE = [
  'Custos Diretos de Obra',
  'Custos Operacionais de Campo',
  'Despesas Administrativas',
  'Investimentos',
] as const

export const TIPOS_CUSTO = ['Direto', 'Indireto', 'Investimento'] as const

export const SIM_NAO = ['Sim', 'Não'] as const

/** Garante que um valor já salvo (fora da lista) não suma do select ao editar. */
export function comValorAtual(opcoes: readonly string[], atual: string | null | undefined): string[] {
  return atual && !opcoes.includes(atual) ? [...opcoes, atual] : [...opcoes]
}
