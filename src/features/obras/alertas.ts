import { CUSTO_ALTO, type NivelAlerta } from '@/components/painel'
import type { ResumoObra } from '@/types/app'
import { diasAte, formatarData, formatarMoeda, formatarPorcento, num } from '@/utils/format'

/** Próximo desta quantidade de dias, a entrega vira aviso. */
const ENTREGA_PROXIMA = 15

export type AlertaObra = {
  id: string
  nivel: NivelAlerta
  titulo: string
  texto: string
  acao: { para: string; rotulo: string }
}

const PESO: Record<NivelAlerta, number> = { critico: 0, aviso: 1, info: 2 }

/** O que merece atenção nas obras em andamento, do mais grave ao mais leve. */
export function alertasDasObras(linhas: readonly ResumoObra[]): AlertaObra[] {
  const alertas: AlertaObra[] = []
  for (const o of linhas) {
    if (o.Status !== 'Em Andamento' || !o.ID_Obra) continue
    const nome = o.Nome_Obra ?? 'Obra sem nome'
    const acao = { para: `/obras/${o.ID_Obra}`, rotulo: 'Ver obra' }
    const contratado = num(o.valor_contratado)
    const custo = num(o.custo_total)
    const saldo = num(o.saldo_caixa)

    if (saldo < 0) {
      alertas.push({
        id: `${o.ID_Obra}-saldo`,
        nivel: 'critico',
        titulo: `${nome}: custo passou o recebido`,
        texto: `Já saiu ${formatarMoeda(-saldo)} a mais do que entrou. Hora de cobrar a próxima parcela.`,
        acao,
      })
    } else if (contratado > 0 && custo / contratado > CUSTO_ALTO) {
      alertas.push({
        id: `${o.ID_Obra}-custo`,
        nivel: 'aviso',
        titulo: `${nome}: custo em ${formatarPorcento(custo / contratado)} do contrato`,
        texto: `Restam ${formatarMoeda(contratado - custo)} até o custo empatar com o valor contratado.`,
        acao,
      })
    }

    const dias = diasAte(o.Previsao_Termino)
    if (dias != null && dias < 0) {
      alertas.push({
        id: `${o.ID_Obra}-prazo`,
        nivel: 'critico',
        titulo: `${nome}: prazo vencido`,
        texto: `A previsão de término era ${formatarData(o.Previsao_Termino)}. Atualize a data ou o status.`,
        acao,
      })
    } else if (dias != null && dias <= ENTREGA_PROXIMA) {
      alertas.push({
        id: `${o.ID_Obra}-entrega`,
        nivel: 'info',
        titulo: `${nome}: entrega ${dias === 0 ? 'hoje' : `em ${dias} ${dias === 1 ? 'dia' : 'dias'}`}`,
        texto: `Previsão de término em ${formatarData(o.Previsao_Termino)}.`,
        acao,
      })
    }
  }
  return alertas.sort((a, b) => PESO[a.nivel] - PESO[b.nivel])
}

/** Texto curto do prazo para cartões e tabelas. */
export function situacaoEntrega(
  status: string | null,
  previsao: string | null,
): { texto: string; nivel: NivelAlerta | null } {
  if (status === 'Concluída') return { texto: 'Concluída', nivel: null }
  if (status === 'Cancelada') return { texto: 'Cancelada', nivel: null }
  const dias = diasAte(previsao)
  if (dias == null) return { texto: 'Sem previsão', nivel: null }
  if (dias < 0) return { texto: `Atrasada ${-dias} ${dias === -1 ? 'dia' : 'dias'}`, nivel: 'critico' }
  if (dias === 0) return { texto: 'Entrega hoje', nivel: 'aviso' }
  return {
    texto: `Entrega em ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
    nivel: dias <= ENTREGA_PROXIMA ? 'aviso' : null,
  }
}
