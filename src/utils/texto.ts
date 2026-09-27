/** Minúsculo e sem acento, para busca tolerante ("joao" acha "João"). */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function contem(termo: string, ...campos: (string | null | undefined)[]): boolean {
  const t = normalizar(termo)
  return !t || campos.some((c) => normalizar(c).includes(t))
}

/** Remove espaços extras; string vazia vira null (o banco guarda null, não ""). */
export function limpar(texto: string | null | undefined): string | null {
  const t = (texto ?? '').replace(/\s+/g, ' ').trim()
  return t === '' ? null : t
}

export function somenteDigitos(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\D/g, '')
}

export function formatarTelefone(texto: string | null | undefined): string {
  const d = somenteDigitos(texto).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
