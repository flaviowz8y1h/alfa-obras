import { ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { LANCAMENTOS } from '@/components/layout/navegacao'

const DESCRICAO: Record<string, string> = {
  '/lancamentos/saidas': 'Material, ferramenta, frete…',
  '/lancamentos/recebimentos': 'Pagamento do cliente',
  '/lancamentos/mao-de-obra': 'Diária, empreitada, adiantamento',
}

const NOVO: Record<string, string> = {
  '/lancamentos/saidas': 'Nova saída',
  '/lancamentos/recebimentos': 'Novo recebimento',
  '/lancamentos/mao-de-obra': 'Novo pagamento',
}

/** Tela "Lançar" do menu inferior: um toque para abrir o formulário certo. */
export function LancamentosPage() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Lançar</h1>
        <p className="mt-1 text-muted-foreground">O que você quer registrar agora?</p>
      </header>

      <ul className="grid gap-3 md:grid-cols-3">
        {LANCAMENTOS.map(({ para, rotulo, icone: Icone }, i) => (
          <li
            key={para}
            className="grid animate-entrar overflow-hidden rounded-xl border bg-card"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Link
              to={`${para}?novo=1`}
              className="group flex min-h-24 items-center gap-4 p-5 transition-colors duration-150 hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-none"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Icone className="size-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{NOVO[para]}</span>
                <span className="block text-sm text-muted-foreground">{DESCRICAO[para]}</span>
              </span>
              <Plus
                className="size-6 text-muted-foreground transition-transform duration-150 group-hover:rotate-90"
                aria-hidden="true"
              />
            </Link>
            <Link
              to={para}
              className="flex min-h-12 items-center justify-between border-t px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
            >
              Ver {rotulo.toLowerCase()} do mês
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
