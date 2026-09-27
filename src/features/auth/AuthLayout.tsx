import { Monograma, PlacaLogo } from '@/components/marca'

type Props = {
  titulo: string
  descricao?: React.ReactNode
  children: React.ReactNode
  rodape?: React.ReactNode
}

/**
 * Tela dividida: painel marinho com a marca (desktop) e formulário à direita.
 * No celular o painel some e a placa com o logo fica no topo.
 */
export function AuthLayout({ titulo, descricao, children, rodape }: Props) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-marca text-marca-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <Monograma className="size-11 text-white" />
          <span className="display text-lg font-bold tracking-wide uppercase">Alfa</span>
        </div>
        <div className="relative max-w-md">
          <p className="display text-4xl leading-[1.05] font-extrabold xl:text-5xl">
            Cada real da obra, no lugar certo.
          </p>
          <p className="mt-4 text-base text-white/75">
            Recebimentos, saídas e mão de obra de todas as obras — do canteiro ao escritório.
          </p>
        </div>
        <p className="relative text-sm text-white/60">Alfa Obras e Reformas</p>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-entrar">
          <PlacaLogo className="mx-auto mb-8 w-56 lg:hidden" />
          <h1 className="text-2xl font-extrabold sm:text-3xl">{titulo}</h1>
          {descricao && <p className="mt-2 text-base text-muted-foreground">{descricao}</p>}
          <div className="mt-8">{children}</div>
          {rodape && <div className="mt-8 text-sm text-muted-foreground">{rodape}</div>}
        </div>
      </main>
    </div>
  )
}
