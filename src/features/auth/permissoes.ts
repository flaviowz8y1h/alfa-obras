import type { Perfil } from '@/types/app'

export const PERFIS_ANALISES: readonly Perfil[] = ['owner', 'admin']

export function podeVerAnalises(perfil: Perfil) {
  return PERFIS_ANALISES.includes(perfil)
}
