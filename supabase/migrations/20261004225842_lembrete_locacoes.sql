-- Lembrete diário de devolução de locações, por e-mail, para os ADMINISTRADORES da empresa
-- (o proprietário não recebe, por decisão do cliente).
--
-- Fluxo: pg_cron (7h de Brasília) -> pg_net chama a Edge Function lembrete-locacoes com um
-- token guardado no Vault -> a função chama as RPCs abaixo (que validam o token) e envia
-- o e-mail por SMTP. Um envio por empresa por dia (tabela de controle).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Token que o agendador manda para a função; nunca sai do banco em texto.
select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'lembrete_locacoes_token',
  'Autoriza a chamada diária da Edge Function lembrete-locacoes'
)
where not exists (select 1 from vault.secrets where name = 'lembrete_locacoes_token');

create table if not exists app_private.lembretes_locacoes_enviados (
  "ID_Empresa" text not null references public."dEmpresas"("ID_Empresa"),
  "Dia" date not null,
  "Enviado_Em" timestamptz not null default now(),
  primary key ("ID_Empresa", "Dia")
);

create or replace function app_private.token_lembrete_ok(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_token, '') <> ''
    and exists (
      select 1 from vault.decrypted_secrets
      where name = 'lembrete_locacoes_token' and decrypted_secret = p_token
    )
$$;
revoke all on function app_private.token_lembrete_ok(text) from public, anon, authenticated;

/** Empresas com devoluções atrasadas / vencendo em até 3 dias, com os e-mails dos admins ativos. */
create or replace function public.lembretes_locacoes_pendentes(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not app_private.token_lembrete_ok(p_token) then
    raise exception 'token inválido' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(e order by e->>'id_empresa')
    from (
      select jsonb_build_object(
        'id_empresa', emp."ID_Empresa",
        'nome_empresa', coalesce(emp."Nome_Empresa", 'Sua empresa'),
        'hoje', v_hoje,
        'emails', (
          select jsonb_agg(distinct u.email)
          from public."dUsuarios" du
          join auth.users u on u.id = du."ID_Usuario"
          where du."ID_Empresa" = emp."ID_Empresa"
            and du."Perfil" = 'admin'
            and du."Status" = 'Ativo'
            and u.email is not null
        ),
        'itens', (
          select jsonb_agg(jsonb_build_object(
              'equipamento', l."Equipamento",
              'quantidade', l."Quantidade",
              'obra', o."Nome_Obra",
              'locadora', l."Locadora",
              'telefone', l."Telefone_Locadora",
              'prevista', l."Data_Devolucao_Prevista",
              'dias', l."Data_Devolucao_Prevista" - v_hoje,
              'valor', l."Valor",
              'cobranca', l."Cobranca"
            ) order by l."Data_Devolucao_Prevista", l."Equipamento")
          from public."fLocacoes" l
          left join public."dObras" o on o."ID_Empresa" = l."ID_Empresa" and o."ID_Obra" = l."ID_Obra"
          where l."ID_Empresa" = emp."ID_Empresa"
            and l."Data_Devolucao" is null
            and l."Data_Devolucao_Prevista" <= v_hoje + 3
        )
      ) as e
      from public."dEmpresas" emp
      where not exists (
        select 1 from app_private.lembretes_locacoes_enviados env
        where env."ID_Empresa" = emp."ID_Empresa" and env."Dia" = v_hoje
      )
    ) t
    where e->'emails' <> 'null'::jsonb and e->'itens' <> 'null'::jsonb
  ), '[]'::jsonb);
end;
$$;

create or replace function public.marcar_lembrete_locacoes_enviado(p_token text, p_empresa text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.token_lembrete_ok(p_token) then
    raise exception 'token inválido' using errcode = '42501';
  end if;
  insert into app_private.lembretes_locacoes_enviados ("ID_Empresa", "Dia")
  values (p_empresa, (now() at time zone 'America/Sao_Paulo')::date)
  on conflict do nothing;
end;
$$;

revoke all on function public.lembretes_locacoes_pendentes(text) from public, anon, authenticated;
revoke all on function public.marcar_lembrete_locacoes_enviado(text, text) from public, anon, authenticated;
grant execute on function public.lembretes_locacoes_pendentes(text) to service_role;
grant execute on function public.marcar_lembrete_locacoes_enviado(text, text) to service_role;

-- 10:00 UTC = 7:00 em Brasília (sem horário de verão)
select cron.unschedule('lembrete-locacoes') where exists (select 1 from cron.job where jobname = 'lembrete-locacoes');
select cron.schedule(
  'lembrete-locacoes',
  '0 10 * * *',
  $cron$
  select net.http_post(
    url := 'https://hbakodabbsukaqprfaip.supabase.co/functions/v1/lembrete-locacoes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-lembrete-token', (select decrypted_secret from vault.decrypted_secrets where name = 'lembrete_locacoes_token')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);
