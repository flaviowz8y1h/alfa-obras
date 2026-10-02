import { z } from 'zod'
import { diasAte, formatarData, hojeISO } from '@/utils/format'

/** A partir de quantos dias no passado a data pede conferência (provável erro de ano). */
const DIAS_DATA_ANTIGA = 365

/**
 * Data de um lançamento: obrigatória e nunca depois de hoje — o que ainda vai
 * acontecer não entrou nem saiu do caixa. Datas passadas são livres.
 */
export const dataLancamento = (mensagemVazia = 'Informe a data.') =>
  z
    .string()
    .min(1, mensagemVazia)
    // 'yyyy-MM-dd' compara certo como texto; hojeISO() roda a cada validação
    .refine((d) => d <= hojeISO(), 'A data não pode ser depois de hoje.')

/** Aviso (não bloqueia) para data com mais de um ano: costuma ser ano digitado errado. */
export function avisoDataAntiga(data: string | undefined): string | null {
  const dias = diasAte(data)
  if (dias == null || dias >= -DIAS_DATA_ANTIGA) return null
  return `${formatarData(data)} foi há mais de um ano. Confira se o ano está certo.`
}
