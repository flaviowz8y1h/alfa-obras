-- 1) Auditoria à prova de falsificação
--    Com usuário logado, Criado_Por/Criado_Em vêm sempre da sessão (o valor enviado é ignorado)
--    e nunca mudam depois. Sem sessão (SQL no painel, importação) mantém o valor informado.
create or replace function app_private.set_audit_fields()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then
      new."Criado_Por" := (select auth.uid());
      new."Criado_Em" := now();
    else
      new."Criado_Em" := coalesce(new."Criado_Em", now());
    end if;
  elsif tg_op = 'UPDATE' then
    new."Criado_Por" := old."Criado_Por";
    new."Criado_Em" := old."Criado_Em";
    new."Atualizado_Em" := now();
    new."Atualizado_Por" := (select auth.uid());
  end if;
  return new;
end;
$$;

-- 2) Lançamentos: owner/admin editam qualquer um; operacional só os que ele mesmo criou.
--    (WITH CHECK roda depois do trigger, que preserva Criado_Por; não dá para "adotar" um lançamento.)
drop policy if exists saidas_update on public."fSaidasObras";
create policy saidas_update on public."fSaidasObras" for update to authenticated
using (
  "ID_Empresa" = (select app_private.current_company_id())
  and (
    (select app_private.current_profile()) in ('owner', 'admin')
    or ((select app_private.current_profile()) = 'operacional' and "Criado_Por" = (select auth.uid()))
  )
)
with check ("ID_Empresa" = (select app_private.current_company_id()));

drop policy if exists recebimentos_update on public."fRecebimentosObras";
create policy recebimentos_update on public."fRecebimentosObras" for update to authenticated
using (
  "ID_Empresa" = (select app_private.current_company_id())
  and (
    (select app_private.current_profile()) in ('owner', 'admin')
    or ((select app_private.current_profile()) = 'operacional' and "Criado_Por" = (select auth.uid()))
  )
)
with check ("ID_Empresa" = (select app_private.current_company_id()));

drop policy if exists pagamentos_update on public."fPagamentosMaoDeObra";
create policy pagamentos_update on public."fPagamentosMaoDeObra" for update to authenticated
using (
  "ID_Empresa" = (select app_private.current_company_id())
  and (
    (select app_private.current_profile()) in ('owner', 'admin')
    or ((select app_private.current_profile()) = 'operacional' and "Criado_Por" = (select auth.uid()))
  )
)
with check ("ID_Empresa" = (select app_private.current_company_id()));
