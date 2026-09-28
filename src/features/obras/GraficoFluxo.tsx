import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  deslocarMes,
  formatarData,
  formatarMoeda,
  formatarMoedaCompacta,
} from '@/utils/format'
import type { PontoFluxo } from './api-detalhe'

const MAX_MESES = 12
const ALTURA = 220
const MARGEM = { topo: 12, direita: 8, base: 28, esquerda: 56 }

/** Preenche meses sem movimento entre o primeiro e o último (a view só traz meses com lançamento). */
function completarMeses(pontos: readonly PontoFluxo[]): PontoFluxo[] {
  if (pontos.length === 0) return []
  const porMes = new Map(pontos.map((p) => [p.mes, p]))
  const saida: PontoFluxo[] = []
  let mes = pontos[0]!.mes
  const ultimo = pontos[pontos.length - 1]!.mes
  while (mes <= ultimo) {
    saida.push(porMes.get(mes) ?? { mes, entradas: 0, saidas: 0, saldo: 0 })
    mes = deslocarMes(mes, 1)
  }
  return saida.slice(-MAX_MESES)
}

/** Escala "redonda" para o eixo Y: 0 até um teto bonito, em 4 marcas. */
function marcasEixo(maximo: number): number[] {
  if (maximo <= 0) return [0]
  const bruto = maximo / 4
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto
  return Array.from({ length: 5 }, (_, i) => i * passo)
}

/** Callback ref: volta a medir quando o elemento é remontado (ex.: ao sair da tabela). */
function useLargura<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [largura, setLargura] = useState(0)
  useEffect(() => {
    if (!el) return
    const obs = new ResizeObserver(([e]) => setLargura(e?.contentRect.width ?? 0))
    obs.observe(el)
    return () => obs.disconnect()
  }, [el])
  return [setEl, largura] as const
}

const rotuloMes = (mes: string) => formatarData(`${mes}-01`, 'MMM/yy').replace('.', '')

export function GraficoFluxo({ pontos }: { pontos: readonly PontoFluxo[] }) {
  const dados = useMemo(() => completarMeses(pontos), [pontos])
  const [ref, largura] = useLargura<HTMLDivElement>()
  const [ativo, setAtivo] = useState<number | null>(null)
  const [comoTabela, setComoTabela] = useState(false)

  const maximo = Math.max(0, ...dados.flatMap((d) => [d.entradas, d.saidas]))
  const marcas = marcasEixo(maximo)
  const teto = marcas[marcas.length - 1] || 1

  const areaL = Math.max(0, largura - MARGEM.esquerda - MARGEM.direita)
  const areaA = ALTURA - MARGEM.topo - MARGEM.base
  const faixa = dados.length ? areaL / dados.length : 0
  // barras finas: no máximo 28px cada, com 2px de respiro entre o par
  const barra = Math.max(4, Math.min(28, (faixa * 0.7 - 2) / 2))
  const y = (v: number) => MARGEM.topo + areaA - (v / teto) * areaA
  const alturaBarra = (v: number) => Math.max(v > 0 ? 2 : 0, (v / teto) * areaA)

  const pontoAtivo = ativo != null ? dados[ativo] : null

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-4 text-sm" aria-label="Legenda">
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-sm bg-serie-entrada" aria-hidden="true" />
            Entradas
          </li>
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-sm bg-serie-saida" aria-hidden="true" />
            Saídas (material + mão de obra)
          </li>
        </ul>
        <Button variant="ghost" size="sm" onClick={() => setComoTabela((v) => !v)} aria-pressed={comoTabela}>
          {comoTabela ? 'Ver gráfico' : 'Ver como tabela'}
        </Button>
      </div>

      {comoTabela ? (
        <TabelaFluxo dados={dados} />
      ) : (
        <div ref={ref} className="relative" onMouseLeave={() => setAtivo(null)}>
          {largura > 0 && (
            <svg
              width={largura}
              height={ALTURA}
              role="img"
              aria-label={`Entradas e saídas por mês, de ${rotuloMes(dados[0]?.mes ?? '')} a ${rotuloMes(dados.at(-1)?.mes ?? '')}. Use "Ver como tabela" para os valores.`}
              className="overflow-visible"
            >
              {/* grade e eixo Y — recessivos */}
              {marcas.map((m) => (
                <g key={m}>
                  <line
                    x1={MARGEM.esquerda}
                    x2={largura - MARGEM.direita}
                    y1={y(m)}
                    y2={y(m)}
                    className={m === 0 ? 'stroke-border' : 'stroke-border/60'}
                    strokeDasharray={m === 0 ? undefined : '2 4'}
                  />
                  <text
                    x={MARGEM.esquerda - 8}
                    y={y(m)}
                    dy="0.32em"
                    textAnchor="end"
                    className="numero fill-muted-foreground text-[11px]"
                  >
                    {formatarMoedaCompacta(m)}
                  </text>
                </g>
              ))}

              {dados.map((d, i) => {
                const centro = MARGEM.esquerda + faixa * i + faixa / 2
                const destaque = ativo === i
                return (
                  <g key={d.mes}>
                    {destaque && (
                      <rect
                        x={centro - faixa / 2}
                        y={MARGEM.topo}
                        width={faixa}
                        height={areaA}
                        className="fill-muted"
                        rx={4}
                      />
                    )}
                    <Barra x={centro - barra - 1} y={y(d.entradas)} largura={barra} altura={alturaBarra(d.entradas)} className="fill-serie-entrada" />
                    <Barra x={centro + 1} y={y(d.saidas)} largura={barra} altura={alturaBarra(d.saidas)} className="fill-serie-saida" />
                    <text
                      x={centro}
                      y={ALTURA - 8}
                      textAnchor="middle"
                      className={cn('text-[11px]', destaque ? 'fill-foreground font-semibold' : 'fill-muted-foreground')}
                    >
                      {rotuloMes(d.mes)}
                    </text>
                    {/* alvo de toque maior que a barra: a coluna inteira */}
                    <rect
                      x={centro - faixa / 2}
                      y={0}
                      width={faixa}
                      height={ALTURA}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`${rotuloMes(d.mes)}: entradas ${formatarMoeda(d.entradas)}, saídas ${formatarMoeda(d.saidas)}, saldo ${formatarMoeda(d.saldo)}`}
                      onMouseEnter={() => setAtivo(i)}
                      onFocus={() => setAtivo(i)}
                      onBlur={() => setAtivo(null)}
                      onClick={() => setAtivo(i)}
                      className="cursor-pointer outline-none"
                    />
                  </g>
                )
              })}
            </svg>
          )}

          {pontoAtivo && ativo != null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 w-52 rounded-lg border bg-popover p-3 text-sm shadow-lg"
              style={{
                left: Math.min(
                  Math.max(0, MARGEM.esquerda + faixa * ativo + faixa / 2 - 104),
                  Math.max(0, largura - 208),
                ),
              }}
            >
              <p className="mb-2 font-semibold first-letter:uppercase">
                {formatarData(`${pontoAtivo.mes}-01`, "MMMM 'de' yyyy")}
              </p>
              <dl className="grid gap-1">
                <LinhaDica cor="bg-serie-entrada" rotulo="Entradas" valor={pontoAtivo.entradas} />
                <LinhaDica cor="bg-serie-saida" rotulo="Saídas" valor={pontoAtivo.saidas} />
                <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                  <dt>Saldo do mês</dt>
                  <dd
                    className={cn(
                      'numero',
                      pontoAtivo.saldo > 0 && 'text-positivo',
                      pontoAtivo.saldo < 0 && 'text-negativo',
                    )}
                  >
                    {pontoAtivo.saldo > 0 ? '+' : ''}
                    {formatarMoeda(pontoAtivo.saldo)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      )}

      {pontos.length > 0 && completarMeses(pontos).length === MAX_MESES && (
        <p className="text-xs text-muted-foreground">Mostrando os últimos {MAX_MESES} meses.</p>
      )}
    </div>
  )
}

/** Barra com topo arredondado (4px) e base reta, apoiada no eixo. */
function Barra({ x, y, largura, altura, className }: { x: number; y: number; largura: number; altura: number; className: string }) {
  if (altura <= 0) return null
  const r = Math.min(4, largura / 2, altura)
  const base = y + altura
  const d = `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${base} Z`
  return <path d={d} className={className} />
}

function LinhaDica({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <span className={cn('size-2.5 rounded-sm', cor)} aria-hidden="true" />
        {rotulo}
      </dt>
      <dd className="numero font-medium">{formatarMoeda(valor)}</dd>
    </div>
  )
}

function TabelaFluxo({ dados }: { dados: readonly PontoFluxo[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Mês</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Entradas</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Saídas</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {dados.map((d) => (
            <tr key={d.mes}>
              <th scope="row" className="px-3 py-2 text-left font-medium first-letter:uppercase">
                {formatarData(`${d.mes}-01`, "MMM 'de' yyyy")}
              </th>
              <td className="numero px-3 py-2 text-right">{formatarMoeda(d.entradas)}</td>
              <td className="numero px-3 py-2 text-right">{formatarMoeda(d.saidas)}</td>
              <td
                className={cn(
                  'numero px-3 py-2 text-right font-semibold',
                  d.saldo > 0 && 'text-positivo',
                  d.saldo < 0 && 'text-negativo',
                )}
              >
                {d.saldo > 0 ? '+' : ''}
                {formatarMoeda(d.saldo)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
