import { useId, useState } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import type { LinhaSemana } from '@/utils/semana-equipe'
import { formatarData, hojeISO, rotuloDia } from '@/utils/format'
import { Skeleton } from '@/components/ui/skeleton'

export function ReguaSemana({
  dias,
  linhas,
  carregando,
  erro,
  mostrarAtalho = true,
}: {
  dias: readonly string[]
  linhas: readonly LinhaSemana[]
  carregando?: boolean
  erro?: string
  mostrarAtalho?: boolean
}) {
  const detalhesId = useId()
  const semana = dias.join(',')
  const [selecao, setSelecao] = useState<{ semana: string; dia: string } | null>(null)
  const diaSelecionado = selecao?.semana === semana ? selecao.dia : null
  const pessoasSelecionadas = linhas.filter((l) => diaSelecionado && l.dias.has(diaSelecionado))
  const hoje = hojeISO()
  const maior = Math.max(1, ...dias.map((d) => linhas.filter((l) => l.dias.has(d)).length))
  return (
    <section
      aria-label="Pessoas com dia pago na semana"
      className="bg-card rounded-2xl border p-3 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Semana de {formatarData(dias[0], 'dd/MM')} a {formatarData(dias.at(-1), 'dd/MM')}
        </p>
        {mostrarAtalho && (
          <Link
            to="/trabalhadores"
            className="text-primary dark:text-ring focus-visible:outline-ring flex min-h-9 items-center rounded text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline-2"
          >
            Ver equipe →
          </Link>
        )}
      </div>
      {erro ? (
        <p role="alert" className="text-destructive text-sm">
          {erro}
        </p>
      ) : (
        <ol className="grid grid-cols-6 gap-1.5 sm:gap-3">
          {dias.map((d, i) => {
            const pessoas = linhas.filter((l) => l.dias.has(d))
            const atual = d === hoje
            return (
              <li key={d} aria-current={atual ? 'date' : undefined} className="min-w-0">
                <button
                  type="button"
                  disabled={carregando}
                  aria-expanded={diaSelecionado === d}
                  aria-controls={detalhesId}
                  aria-label={`${formatarData(d, 'EEEE, dd/MM')}${carregando ? ', carregando' : `, ${pessoas.length} ${pessoas.length === 1 ? 'pessoa com dia pago' : 'pessoas com dia pago'}`}`}
                  onClick={() => setSelecao(diaSelecionado === d ? null : { semana, dia: d })}
                  className={cn(
                    'bg-muted/35 focus-visible:outline-ring hover:bg-muted/60 relative w-full cursor-pointer rounded-xl border px-1.5 py-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait sm:px-3',
                    atual && 'border-aviso bg-aviso-fundo ring-aviso/30 ring-1',
                    diaSelecionado === d && 'border-ring ring-ring/40 ring-2',
                  )}
                >
                  {atual && (
                    <span className="bg-aviso dark:bg-dourado dark:text-marca absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white">
                      HOJE
                    </span>
                  )}
                  <p className="font-heading text-muted-foreground text-[11px] font-bold uppercase sm:text-xs">
                    {rotuloDia(d).semana}
                  </p>
                  <p className="font-heading numero text-xl font-extrabold sm:text-3xl">
                    {rotuloDia(d).numero}
                  </p>
                  {carregando ? (
                    <Skeleton className="mx-auto mt-3 h-12 w-6" />
                  ) : (
                    <>
                      <div
                        aria-hidden="true"
                        className="mx-auto mt-3 flex h-12 w-5 items-end sm:w-7"
                      >
                        <span
                          className={cn(
                            'semana-coluna bg-primary w-full rounded-sm',
                            atual && 'bg-aviso dark:bg-dourado',
                          )}
                          style={{
                            height: `${(pessoas.length / maior) * 100}%`,
                            animationDelay: `${i * 60}ms`,
                          }}
                        />
                      </div>
                      <p
                        className="numero mt-2 text-sm font-bold"
                        aria-label={`${pessoas.length} ${pessoas.length === 1 ? 'pessoa com dia pago' : 'pessoas com dia pago'} em ${formatarData(d, 'EEEE, dd/MM')}`}
                      >
                        {pessoas.length}
                      </p>
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      )}
      <p className="text-muted-foreground mt-3 text-xs">
        Clique em um dia para ver as pessoas com dia pago. Dias sem confirmação não indicam
        ausência.
      </p>
      <div id={detalhesId} aria-live="polite" aria-atomic="true">
        {diaSelecionado && !carregando && !erro && (
          <section
            aria-label={`Detalhes de ${formatarData(diaSelecionado, 'EEEE, dd/MM')}`}
            className="bg-muted/25 mt-4 rounded-xl border p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold capitalize">
                {formatarData(diaSelecionado, 'EEEE, dd/MM/yyyy')}
              </h3>
              <span className="text-muted-foreground text-sm">
                {pessoasSelecionadas.length}{' '}
                {pessoasSelecionadas.length === 1 ? 'pessoa com dia pago' : 'pessoas com dia pago'}
              </span>
            </div>
            {pessoasSelecionadas.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                Nenhum dia pago confirmado para esta data.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {pessoasSelecionadas.map(({ trabalhador }) => (
                  <li
                    key={trabalhador.ID_Trabalhador}
                    className="bg-card min-w-0 rounded-lg border p-3"
                  >
                    <p className="font-semibold break-words">
                      {trabalhador.Nome_Trabalhador ?? 'Sem nome'}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs break-words">
                      {[trabalhador.Funcao, trabalhador.Tipo_Vinc_Contrato]
                        .filter(Boolean)
                        .join(' · ') || 'Dia pago confirmado'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </section>
  )
}
