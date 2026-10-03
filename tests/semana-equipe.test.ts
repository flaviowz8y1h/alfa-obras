import assert from 'node:assert/strict'
import { test } from 'node:test'
import { montarSemana } from '../src/utils/semana-equipe.ts'
import type { Trabalhador } from '../src/types/app.ts'
import type { PagamentoSemana } from '../src/features/trabalhadores/api.ts'

const dias = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']
const trabalhador = (id: string, status = 'Ativo') =>
  ({
    ID_Trabalhador: id,
    Nome_Trabalhador: id,
    Tipo_Vinc_Contrato: 'Diarista',
    Status: status,
  }) as Trabalhador
const pagamento = (dados: Partial<PagamentoSemana> = {}): PagamentoSemana => ({
  ID_Pagamento: 'p1',
  ID_Trabalhador: 'Ana',
  Nome_Obra: 'Obra A',
  Data_Pagamento: '2026-10-02',
  Periodo_Inicio: '2026-10-01',
  Periodo_Fim: '2026-10-02',
  Quantidade_Dias: 2,
  Dias_Trabalhados: ['2026-10-01', '2026-10-02'],
  Tipo_Pagamento: 'Diária',
  Valor_Pago: 200,
  Valor_Diaria_Aplicado: 100,
  ...dados,
})

test('régua conta uma pessoa por dia mesmo com pagamentos em duas obras', () => {
  const linhas = montarSemana(
    dias,
    [pagamento(), pagamento({ ID_Pagamento: 'p2', Nome_Obra: 'Obra B', Valor_Pago: 100 })],
    [trabalhador('Ana')],
  )
  assert.equal(linhas.length, 1)
  assert.equal(linhas[0]!.dias.size, 2)
  assert.equal(linhas[0]!.valor, 300)
  assert.deepEqual([...linhas[0]!.obras], ['Obra A', 'Obra B'])
})

test('pagamento parcial sem datas gera conferência sem inventar dias pagos', () => {
  const linhas = montarSemana(
    dias,
    [pagamento({ Dias_Trabalhados: null, Quantidade_Dias: 1, Valor_Pago: 100 })],
    [trabalhador('Ana'), trabalhador('Bia'), trabalhador('Caio', 'Inativo')],
  )
  assert.equal(linhas.length, 2)
  assert.equal(linhas[0]!.semDatas, true)
  assert.equal(linhas[0]!.dias.size, 0)
  assert.equal(linhas[0]!.valor, 100)
  assert.equal(linhas[1]!.semDatas, false)
  assert.equal(linhas[1]!.valor, 0)
})

test('semana divide pagamento que atravessa semanas sem contar datas externas', () => {
  const linhas = montarSemana(
    dias,
    [pagamento({ Dias_Trabalhados: ['2026-10-02', '2026-10-05'], Periodo_Fim: '2026-10-05' })],
    [trabalhador('Ana')],
  )
  assert.equal(linhas[0]!.valor, 100)
  assert.deepEqual([...linhas[0]!.dias], ['2026-10-02'])
})
