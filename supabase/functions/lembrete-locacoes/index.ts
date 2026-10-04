// Lembrete diário de devolução de locações para os ADMINISTRADORES de cada empresa.
// Chamada só pelo agendador (pg_cron + pg_net, 7h de Brasília) com o token do Vault no
// cabeçalho x-lembrete-token; as RPCs validam o token e não deixam enviar 2x no mesmo dia.
// Deploy sem verificação de JWT (o agendador não tem sessão): a proteção é o token.
//
// Secrets necessários (Edge Functions → Secrets): SMTP_USER e SMTP_PASS (senha de app).
// Opcionais: SMTP_HOST (smtp.gmail.com), SMTP_PORT (465), SMTP_FROM_NAME.
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

type Item = {
  equipamento: string
  quantidade: number
  obra: string | null
  locadora: string | null
  telefone: string | null
  prevista: string
  dias: number
  valor: number | null
  cobranca: string | null
}
type Empresa = { id_empresa: string; nome_empresa: string; hoje: string; emails: string[]; itens: Item[] }

const SITE = 'https://alfa-obras.vercel.app'
const DIAS_POR_PERIODO: Record<string, number> = { Diária: 1, Semanal: 7, Quinzenal: 15, Mensal: 30 }
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

function escapar(texto: string | null | undefined): string {
  return (texto ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function data(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

function prazo(dias: number): string {
  if (dias < 0) return `Atrasada ${-dias} ${dias === -1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'Devolve hoje'
  return `Devolver em ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

/** Aluguel a mais pelo atraso, pela cobrança informada (estimativa). */
function custoAtraso(i: Item): number | null {
  const periodo = DIAS_POR_PERIODO[i.cobranca ?? '']
  if (i.dias >= 0 || !periodo || !i.valor) return null
  return (Number(i.valor) / periodo) * -i.dias
}

function montarEmail(e: Empresa) {
  const atrasadas = e.itens.filter((i) => i.dias < 0).length
  const hoje = e.itens.filter((i) => i.dias === 0).length
  const logo = e.itens.length - atrasadas - hoje
  const partes = [
    atrasadas && `${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}`,
    hoje && `${hoje} para devolver hoje`,
    logo && `${logo} vencendo em breve`,
  ].filter(Boolean)
  const nome = e.nome_empresa.trim()
  const assunto = `Locações: ${partes.join(' · ')} — ${nome}`

  const linhasTexto = e.itens.map((i) => {
    const extra = custoAtraso(i)
    return [
      `• ${i.equipamento}${Number(i.quantidade) !== 1 ? ` (x${Number(i.quantidade)})` : ''} — ${prazo(i.dias)} (${data(i.prevista)})`,
      `  ${[i.obra ?? 'Geral da empresa', i.locadora, i.telefone].filter(Boolean).join(' · ')}`,
      extra ? `  Cerca de ${brl.format(extra)} a mais em aluguel.` : null,
    ]
      .filter(Boolean)
      .join('\n')
  })
  const texto = `Bom dia!\n\nLocações que precisam de atenção em ${nome}:\n\n${linhasTexto.join('\n\n')}\n\nDevolva ou prorrogue com a locadora e atualize no sistema:\n${SITE}/locacoes\n`

  const linhasHtml = e.itens
    .map((i) => {
      const extra = custoAtraso(i)
      const cor = i.dias <= 0 ? '#b42318' : '#8a4b08'
      const fundo = i.dias <= 0 ? '#fdecec' : '#fff4e5'
      return `<tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb">
        <div style="font-weight:700;font-size:15px;color:#111f49">${escapar(i.equipamento)}${Number(i.quantidade) !== 1 ? ` <span style="font-weight:400;color:#6b7280">× ${Number(i.quantidade)}</span>` : ''}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px">${escapar([i.obra ?? 'Geral da empresa', i.locadora, i.telefone].filter(Boolean).join(' · '))}</div>
        ${extra ? `<div style="font-size:13px;color:#b42318;margin-top:4px;font-weight:600">≈ ${brl.format(extra)} a mais em aluguel</div>` : ''}
      </td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">
        <span style="display:inline-block;padding:4px 8px;border-radius:6px;background:${fundo};color:${cor};font-size:12px;font-weight:700">${prazo(i.dias)}</span>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">${data(i.prevista)}</div>
      </td></tr>`
    })
    .join('')

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f4f8;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#111f49;color:#fff;border-radius:12px 12px 0 0;padding:18px 20px">
      <div style="font-size:12px;letter-spacing:1px;color:#dcc68c;text-transform:uppercase">${escapar(nome)}</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px">Locações para devolver</div>
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;padding:4px 0 20px">
      <p style="padding:12px 20px 0;margin:0;color:#374151;font-size:14px">Bom dia! Estes equipamentos alugados precisam de atenção:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px">${linhasHtml}</table>
      <div style="padding:20px 20px 0">
        <a href="${SITE}/locacoes" style="display:inline-block;background:#1b5097;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Abrir locações</a>
      </div>
      <p style="padding:16px 20px 0;margin:0;color:#6b7280;font-size:12px">Devolva ou prorrogue com a locadora e marque no sistema ("Devolvi" ou "Prorrogar"). Este aviso é enviado aos administradores às 7h, só quando há devoluções próximas ou atrasadas.</p>
    </div>
  </div></body></html>`

  return { assunto, texto, html }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405)
  const token = req.headers.get('x-lembrete-token') ?? ''
  if (!token) return resposta({ erro: 'Não autorizado.' }, 401)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: pendentes, error } = await db.rpc('lembretes_locacoes_pendentes', { p_token: token })
  if (error) {
    const negado = error.code === '42501'
    if (!negado) console.error(error)
    return resposta({ erro: negado ? 'Não autorizado.' : 'Falha ao consultar locações.' }, negado ? 401 : 500)
  }
  const empresas = (pendentes ?? []) as Empresa[]
  if (empresas.length === 0) return resposta({ enviados: 0, motivo: 'nada para avisar hoje' })

  const usuario = Deno.env.get('SMTP_USER')
  const senha = Deno.env.get('SMTP_PASS')
  if (!usuario || !senha) {
    console.error('SMTP_USER/SMTP_PASS não configurados')
    return resposta({ erro: 'E-mail não configurado (SMTP_USER/SMTP_PASS).' }, 500)
  }
  const porta = Number(Deno.env.get('SMTP_PORT') ?? 465)
  const transporte = nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com',
    port: porta,
    secure: porta === 465,
    auth: { user: usuario, pass: senha },
  })
  const remetente = `"${Deno.env.get('SMTP_FROM_NAME') ?? 'Alfa Obras'}" <${usuario}>`

  let enviados = 0
  const falhas: string[] = []
  for (const e of empresas) {
    const { assunto, texto, html } = montarEmail(e)
    try {
      await transporte.sendMail({ from: remetente, to: e.emails.join(', '), subject: assunto, text: texto, html })
      await db.rpc('marcar_lembrete_locacoes_enviado', { p_token: token, p_empresa: e.id_empresa })
      enviados++
    } catch (err) {
      console.error(`Falha ao enviar para a empresa ${e.id_empresa}:`, err)
      falhas.push(e.id_empresa)
    }
  }
  return resposta({ enviados, falhas }, falhas.length ? 500 : 200)
})
