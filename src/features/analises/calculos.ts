import { eachMonthOfInterval, format, isValid, parseISO } from 'date-fns'

export type MovimentoAnalise = {
  id: string
  tipo: 'recebimento' | 'saida' | 'mao_de_obra'
  data: string
  valor: number
  obraId: string | null
  obra: string
  grupoId: string
  grupo: string
  descricao: string
}
export type FiltrosAnalise = { inicio: string; fim: string; obra: string }
export type GrupoAnalise = { id: string; nome: string; valor: number; quantidade: number }

export function periodoValido({ inicio, fim }: Pick<FiltrosAnalise, 'inicio' | 'fim'>) {
  return (
    [inicio, fim].every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && isValid(parseISO(d))) &&
    inicio <= fim
  )
}

/** Soma em centavos para evitar diferenças de arredondamento entre os painéis. */
export function somarValores(movimentos: readonly MovimentoAnalise[]) {
  return movimentos.reduce((s, m) => s + Math.round(m.valor * 100), 0) / 100
}

export function agruparGastos(
  movimentos: readonly MovimentoAnalise[],
  tipo: 'saida' | 'mao_de_obra',
): GrupoAnalise[] {
  const grupos = new Map<string, GrupoAnalise>()
  for (const m of movimentos.filter((m) => m.tipo === tipo)) {
    const g = grupos.get(m.grupoId) ?? { id: m.grupoId, nome: m.grupo, valor: 0, quantidade: 0 }
    g.valor += Math.round(m.valor * 100)
    g.quantidade++
    grupos.set(m.grupoId, g)
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, valor: g.valor / 100 }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export function calcularAnalise(movimentos: readonly MovimentoAnalise[], filtros: FiltrosAnalise) {
  const itens = periodoValido(filtros)
    ? movimentos.filter(
        (m) =>
          m.data >= filtros.inicio &&
          m.data <= filtros.fim &&
          (!filtros.obra || (filtros.obra === 'geral' ? !m.obraId : m.obraId === filtros.obra)),
      )
    : []
  const recebido = somarValores(itens.filter((m) => m.tipo === 'recebimento'))
  const saidas = somarValores(itens.filter((m) => m.tipo === 'saida'))
  const equipe = somarValores(itens.filter((m) => m.tipo === 'mao_de_obra'))
  const gasto = Math.round((saidas + equipe) * 100) / 100
  const meses = new Map<string, { mes: string; entradas: number; saidas: number; saldo: number }>()
  if (periodoValido(filtros)) {
    for (const d of eachMonthOfInterval({
      start: parseISO(filtros.inicio),
      end: parseISO(filtros.fim),
    })) {
      const mes = format(d, 'yyyy-MM')
      meses.set(mes, { mes, entradas: 0, saidas: 0, saldo: 0 })
    }
  }
  for (const m of itens) {
    const p = meses.get(m.data.slice(0, 7))!
    if (m.tipo === 'recebimento') p.entradas += Math.round(m.valor * 100)
    else p.saidas += Math.round(m.valor * 100)
  }
  return {
    itens,
    recebido,
    saidas,
    equipe,
    gasto,
    resultado: Math.round((recebido - gasto) * 100) / 100,
    categorias: agruparGastos(itens, 'saida'),
    trabalhadores: agruparGastos(itens, 'mao_de_obra'),
    meses: [...meses.values()].map((p) => ({
      ...p,
      entradas: p.entradas / 100,
      saidas: p.saidas / 100,
      saldo: (p.entradas - p.saidas) / 100,
    })),
  }
}

/** Não interrompe totais no limite padrão de linhas da API. */
export async function lerPaginas<T>(
  pagina: (inicio: number, fim: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  tamanho = 500,
): Promise<T[]> {
  const linhas: T[] = []
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await pagina(inicio, inicio + tamanho - 1)
    if (error) throw error
    linhas.push(...(data ?? []))
    if (!data || data.length < tamanho) return linhas
  }
}
