import { QueryClient } from '@tanstack/react-query'

/** Erros que não adianta repetir: permissão (RLS) e sessão. */
function erroDefinitivo(erro: unknown): boolean {
  const e = erro as { code?: string; status?: number } | null
  return e?.code === '42501' || e?.code === 'PGRST301' || e?.status === 401 || e?.status === 403
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (tentativas, erro) => !erroDefinitivo(erro) && tentativas < 2,
    },
  },
})
