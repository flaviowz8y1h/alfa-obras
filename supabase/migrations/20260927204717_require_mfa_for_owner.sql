-- Require AAL2 for owner access across all core tables.
-- Admin/operacional remain allowed with AAL1 for now.

create or replace function app_private.owner_mfa_ok()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select
    case
      when (select app_private.current_profile()) = 'owner'
        then coalesce((select auth.jwt()->>'aal') = 'aal2', false)
      else true
    end
$$;

revoke all on function app_private.owner_mfa_ok() from public, anon;
grant execute on function app_private.owner_mfa_ok() to authenticated;

-- Add restrictive MFA policies to every app table.
do $$
declare
  t text;
  pol text;
begin
  foreach t in array array[
    'dEmpresas','dClientes','dObras','dTrabalhadores','dCategoriaGastos',
    'fRecebimentosObras','fSaidasObras','fPagamentosMaoDeObra','dUsuarios'
  ]
  loop
    pol := 'require_owner_aal2_' || lower(t);
    execute format('drop policy if exists %I on public.%I', pol, t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using ((select app_private.owner_mfa_ok())) with check ((select app_private.owner_mfa_ok()))',
      pol, t
    );
  end loop;
end $$;
