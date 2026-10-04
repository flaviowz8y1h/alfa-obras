/*
 * Valores de domínio. O banco guarda texto livre (sem CHECK), então a lista vive aqui.
 * Valores antigos fora da lista continuam aparecendo nos selects (ver `comValorAtual`).
 */

export const STATUS_CADASTRO = ['Ativo', 'Inativo'] as const
export type StatusCadastro = (typeof STATUS_CADASTRO)[number]

export const STATUS_OBRA = ['Em Andamento', 'Pausada', 'Concluída', 'Cancelada'] as const

export const VINCULOS = ['Diarista', 'Autônomo', 'PJ', 'Empreiteiro', 'CLT'] as const

/**
 * O cadastro guarda um único "valor padrão" (coluna Valor_Diaria_Padrao), mas o
 * significado depende do vínculo: só para diarista ele é uma diária.
 */
export function valorReferencia(vinculo: string | null | undefined): {
  rotuloCampo: string
  sufixo: string
  ehDiaria: boolean
  tipoPagamento: string
} {
  switch (vinculo) {
    case 'Diarista':
      return { rotuloCampo: 'Diária padrão', sufixo: '/dia', ehDiaria: true, tipoPagamento: 'Diária' }
    case 'CLT':
      return { rotuloCampo: 'Salário de referência', sufixo: '/mês', ehDiaria: false, tipoPagamento: 'Outro' }
    case 'Empreiteiro':
      return { rotuloCampo: 'Valor de referência', sufixo: '', ehDiaria: false, tipoPagamento: 'Empreitada' }
    default:
      return { rotuloCampo: 'Valor de referência', sufixo: '', ehDiaria: false, tipoPagamento: 'Outro' }
  }
}

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

export const FORMAS_PAGAMENTO = [
  'PIX',
  'Dinheiro',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Transferência',
  'Boleto',
] as const

export const TIPOS_PAGAMENTO_MO = ['Diária', 'Empreitada', 'Adiantamento', 'Outro'] as const

/** Como a locadora cobra (check fLocacoes.Cobranca). */
export const COBRANCAS_LOCACAO = ['Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Valor fechado'] as const

/** Garante que um valor já salvo (fora da lista) não suma do select ao editar. */
export function comValorAtual(opcoes: readonly string[], atual: string | null | undefined): string[] {
  return atual && !opcoes.includes(atual) ? [...opcoes, atual] : [...opcoes]
}
