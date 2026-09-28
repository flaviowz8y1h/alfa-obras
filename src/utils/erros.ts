type ErroComCodigo = { code?: string; message?: string; status?: number }

const MENSAGENS_AUTH: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Seu e-mail ainda não foi confirmado.',
  user_banned: 'Seu acesso está bloqueado. Fale com o responsável da empresa.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos.',
  mfa_verification_failed: 'Código inválido ou expirado. Confira o app autenticador.',
  mfa_challenge_expired: 'O desafio expirou. Tente de novo.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.',
  insufficient_aal: 'Confirme o código de verificação em duas etapas antes de continuar.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
}

/** Para delete: a RLS filtra em silêncio, então 0 linhas afetadas vira erro explícito. */
export function exigirLinhas<T>(linhas: T[] | null): T[] {
  if (!linhas || linhas.length === 0) throw { code: 'SEM_LINHAS' }
  return linhas
}

/** Converte erros do Supabase (Auth ou PostgREST/RLS) em mensagem amigável em pt-BR. */
export function mensagemDeErro(erro: unknown): string {
  if (!erro || typeof erro !== 'object') return 'Algo deu errado. Tente de novo.'
  const { code, message = '', status } = erro as ErroComCodigo

  // mensagens das Edge Functions já chegam prontas para o usuário
  if (code === 'FUNCAO' && message) return message
  if (code && MENSAGENS_AUTH[code]) return MENSAGENS_AUTH[code]
  // 42501 = violação de RLS / permissão negada no Postgres
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return 'Você não tem permissão para esta ação. Fale com o proprietário da conta.'
  }
  // update/delete bloqueado por RLS não dá erro: volta 0 linhas (PGRST116 no .single())
  if (code === 'PGRST116' || code === 'SEM_LINHAS') {
    return 'O registro não foi encontrado ou você não tem permissão para alterá-lo.'
  }
  if (code === '23505') return 'Já existe um registro com esses dados.'
  if (code === '23503') {
    return 'Este registro tem lançamentos ou cadastros ligados a ele e não pode ser excluído. Você pode inativá-lo.'
  }
  if (status === 0 || /failed to fetch|network/i.test(message)) {
    return 'Sem conexão com o servidor. Verifique a internet e tente de novo.'
  }
  return 'Algo deu errado. Tente de novo.'
}
