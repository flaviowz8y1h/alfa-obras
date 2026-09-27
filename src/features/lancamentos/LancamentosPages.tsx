import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { LANCAMENTOS } from '@/components/layout/navegacao'
import { PaginaEmConstrucao } from '@/components/pagina-em-construcao'

export function LancamentosPage() {
  return (
    <PaginaEmConstrucao titulo="Lançamentos" descricao="O que você quer lançar?">
      <ul className="grid gap-3 sm:grid-cols-3">
        {LANCAMENTOS.map(({ para, rotulo, icone: Icone }) => (
          <li key={para}>
            <Link
              to={para}
              className="group flex min-h-20 items-center gap-4 rounded-xl border bg-card p-5 transition-colors duration-150 hover:border-ring/50 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Icone className="size-5" aria-hidden="true" />
              </span>
              <span className="flex-1 text-lg font-semibold">{rotulo}</span>
              <ChevronRight
                className="size-5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </PaginaEmConstrucao>
  )
}

export function SaidasPage() {
  return (
    <PaginaEmConstrucao titulo="Saídas" descricao="Compras de material e demais gastos por obra." />
  )
}

export function RecebimentosPage() {
  return (
    <PaginaEmConstrucao titulo="Recebimentos" descricao="Pagamentos recebidos dos clientes por obra." />
  )
}

export function MaoDeObraPage() {
  return (
    <PaginaEmConstrucao titulo="Mão de obra" descricao="Diárias e pagamentos aos trabalhadores." />
  )
}
