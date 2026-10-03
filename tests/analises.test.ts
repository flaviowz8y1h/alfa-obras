import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calcularAnalise, lerPaginas, periodoValido, type MovimentoAnalise } from '../src/features/analises/calculos.ts'

const m = (id: string, tipo: MovimentoAnalise['tipo'], data: string, valor: number, obraId: string | null = 'A', grupoId = 'g', grupo = 'Grupo'): MovimentoAnalise => ({id,tipo,data,valor,obraId,obra:obraId ?? 'Geral',grupoId,grupo,descricao:id})
const filtros = {inicio:'2026-09-01',fim:'2026-10-03',obra:''}

test('período inclusivo usa datas de pagamento e inclui os gastos gerais', () => {
  const r = calcularAnalise([m('1','recebimento','2026-09-01',1000),m('2','saida','2026-10-03',100),m('3','mao_de_obra','2026-10-01',200),m('4','saida','2026-09-20',50,null),m('5','mao_de_obra','2026-08-31',999),m('6','recebimento','2026-10-04',999)],filtros)
  assert.equal(r.recebido,1000); assert.equal(r.gasto,350); assert.equal(r.resultado,650)
  assert.deepEqual(r.meses,[{mes:'2026-09',entradas:1000,saidas:50,saldo:950},{mes:'2026-10',entradas:0,saidas:300,saldo:-300}])
})
test('filtrar obra exclui outras obras e despesas gerais; filtro geral não inclui obras', () => {
  const itens = [m('1','saida','2026-09-01',10,'A'),m('2','saida','2026-09-01',20,'B'),m('3','saida','2026-09-01',30,null)]
  assert.equal(calcularAnalise(itens,{...filtros,obra:'A'}).gasto,10)
  assert.equal(calcularAnalise(itens,{...filtros,obra:'geral'}).gasto,30)
})
test('agrupa por id: nomes iguais não misturam trabalhadores; categorias e equipe reconciliam gastos', () => {
  const r=calcularAnalise([m('1','mao_de_obra','2026-09-01',10,'A','T1','José'),m('2','mao_de_obra','2026-09-02',20,'B','T1','José'),m('3','mao_de_obra','2026-09-02',40,'A','T2','José'),m('4','saida','2026-09-02',5,'A','C1','Material')],filtros)
  assert.equal(r.trabalhadores.length,2)
  assert.deepEqual(r.trabalhadores.find(g=>g.id==='T1'),{id:'T1',nome:'José',valor:30,quantidade:2})
  assert.equal(r.categorias.reduce((s,g)=>s+g.valor,0)+r.trabalhadores.reduce((s,g)=>s+g.valor,0),r.gasto)
})
test('soma centavos e preenche meses sem movimento', () => {
  const r=calcularAnalise([m('1','saida','2026-09-01',0.1),m('2','saida','2026-09-01',0.2)],filtros)
  assert.equal(r.gasto,0.3);assert.equal(r.categorias[0]?.valor,0.3);assert.equal(r.meses[1]?.saidas,0)
})
test('rejeita período invertido ou data impossível; período vazio mantém meses zerados', () => {
  assert.equal(periodoValido({...filtros,inicio:'2026-02-30'}),false)
  assert.equal(periodoValido({...filtros,inicio:'2026-12-01'}),false)
  assert.equal(calcularAnalise([],filtros).meses.length,2)
})
test('paginação não trunca totais após 1000 registros e propaga erro de página', async () => {
  const todos=Array.from({length:1201},(_,i)=>i)
  const linhas=await lerPaginas(async(a,b)=>({data:todos.slice(a,b+1),error:null}))
  assert.deepEqual(linhas,todos)
  await assert.rejects(lerPaginas(async(a)=>a ? {data:null,error:new Error('Falha')} : {data:todos.slice(0,500),error:null}),/Falha/)
})
