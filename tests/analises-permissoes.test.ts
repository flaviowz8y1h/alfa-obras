import assert from 'node:assert/strict'
import test from 'node:test'
import { PERFIS_ANALISES, podeVerAnalises } from '../src/features/auth/permissoes.ts'

test('análises são exclusivas de proprietário e administrador', () => {
  assert.deepEqual(PERFIS_ANALISES, ['owner', 'admin'])
  assert.equal(podeVerAnalises('owner'), true)
  assert.equal(podeVerAnalises('admin'), true)
  assert.equal(podeVerAnalises('operacional'), false)
})
