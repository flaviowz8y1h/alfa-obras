import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'

export function NaoEncontradaPage() {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 py-20 text-center">
      <p className="display numero text-6xl font-extrabold text-muted-foreground">404</p>
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço pode ter mudado ou não existe.</p>
      <Link to="/" className={buttonVariants({ className: 'mt-2' })}>
        Voltar ao início
      </Link>
    </div>
  )
}
