import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  datasPagamento,
  datasParaSalvar,
  diasPadrao,
  resumoDiariaNaSemana,
} from '../src/utils/diarias.ts'

const semana = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']
const pagamento = {
  Periodo_Inicio: '2026-10-01',
  Periodo_Fim: '2026-10-03',
  Quantidade_Dias: 2,
  Dias_Trabalhados: ['2026-10-01', '2026-10-02'],
  Valor_Pago: 200,
  Data_Pagamento: '2026-10-02',
}

test('duas diárias não marcam o sábado do período como pago', () => {
  assert.deepEqual(resumoDiariaNaSemana(pagamento, semana), {
    datas: ['2026-10-01', '2026-10-02'],
    valor: 200,
    semDatas: false,
  })
  assert.deepEqual(datasPagamento(pagamento), pagamento.Dias_Trabalhados)
})

test('persistência preserva dias não consecutivos e ignora datas fora do período', () => {
  assert.deepEqual(
    datasParaSalvar(
      new Set(['2026-09-28', '2026-10-01', '2026-10-03']),
      2,
      '2026-10-01',
      '2026-10-03',
    ),
    ['2026-10-01', '2026-10-03'],
  )
})

test('trocar período recalcula dias úteis e exclui domingo', () => {
  assert.deepEqual(diasPadrao('2026-10-01', '2026-10-04'), [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
  ])
  assert.deepEqual(diasPadrao('2026-10-02', '2026-10-01'), [])
  assert.deepEqual(diasPadrao('', '2026-10-01'), [])
})

test('registro antigo parcial não inventa dias pagos', () => {
  const antigo = { ...pagamento, Dias_Trabalhados: null }
  assert.equal(datasPagamento(antigo), null)
  assert.deepEqual(resumoDiariaNaSemana(antigo, semana), { datas: [], valor: 200, semDatas: true })
  assert.equal(datasPagamento({ ...antigo, Quantidade_Dias: 3 })?.length, 3)
})

test('quantidade manual e meio dia não salvam datas de dias inteiros indevidas', () => {
  assert.equal(
    datasParaSalvar(new Set(pagamento.Dias_Trabalhados), 1.5, '2026-10-01', '2026-10-03'),
    null,
  )
})

test('pagamento atravessando semanas é dividido apenas entre as datas selecionadas', () => {
  const cruzado = {
    ...pagamento,
    Periodo_Fim: '2026-10-05',
    Dias_Trabalhados: ['2026-10-02', '2026-10-05'],
  }
  assert.equal(resumoDiariaNaSemana(cruzado, semana).valor, 100)
  assert.equal(resumoDiariaNaSemana(cruzado, ['2026-10-05']).valor, 100)
})
