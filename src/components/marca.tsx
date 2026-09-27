import { cn } from '@/lib/utils'

/** Monograma "A" da Alfa: prédio + telhado, em traço reto. */
export function Monograma({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-9', className)} aria-hidden="true" fill="none">
      <path d="M13 40 23 8h4L17 40z" fill="#1D4ED8" />
      <path d="M23 8h4l12 32h-5z" fill="currentColor" />
      <path d="M7 40 24 26l17 14h-6L24 31 13 40z" fill="currentColor" />
      <g fill="#fff" opacity=".9">
        <rect x="19.5" y="17" width="2.2" height="2.2" />
        <rect x="18.3" y="21" width="2.2" height="2.2" />
      </g>
    </svg>
  )
}

/** Logo completo numa "placa de obra" branca — funciona em tema claro e escuro. */
export function PlacaLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10',
        className,
      )}
    >
      <img
        src="/logo-alfa.webp"
        alt="Alfa Construções — Engenharia de alto padrão"
        width={1536}
        height={1024}
        className="h-auto w-full"
        decoding="async"
      />
    </div>
  )
}
