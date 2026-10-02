-- 1) Add company ownership where it was missing
alter table public."dClientes" add column if not exists "ID_Empresa" text;
update public."dClientes" set "ID_Empresa" = 'EM01' where "ID_Empresa" is null;
alter table public."dClientes" alter column "ID_Empresa" set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'dClientes_ID_Empresa_fkey') then
    alter table public."dClientes"
      add constraint "dClientes_ID_Empresa_fkey"
      foreign key ("ID_Empresa") references public."dEmpresas"("ID_Empresa");
  end if;
end $$;
create index if not exists "idx_dClientes_ID_Empresa" on public."dClientes" ("ID_Empresa");

alter table public."dTrabalhadores" add column if not exists "ID_Empresa" text;
update public."dTrabalhadores" set "ID_Empresa" = 'EM01' where "ID_Empresa" is null;
alter table public."dTrabalhadores" alter column "ID_Empresa" set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'dTrabalhadores_ID_Empresa_fkey') then
    alter table public."dTrabalhadores"
      add constraint "dTrabalhadores_ID_Empresa_fkey"
      foreign key ("ID_Empresa") references public."dEmpresas"("ID_Empresa");
  end if;
end $$;
create index if not exists "idx_dTrabalhadores_ID_Empresa" on public."dTrabalhadores" ("ID_Empresa");

alter table public."dCategoriaGastos" add column if not exists "ID_Empresa" text;
update public."dCategoriaGastos" set "ID_Empresa" = 'EM01' where "ID_Empresa" is null;
alter table public."dCategoriaGastos" alter column "ID_Empresa" set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'dCategoriaGastos_ID_Empresa_fkey') then
    alter table public."dCategoriaGastos"
      add constraint "dCategoriaGastos_ID_Empresa_fkey"
      foreign key ("ID_Empresa") references public."dEmpresas"("ID_Empresa");
  end if;
end $$;
create index if not exists "idx_dCategoriaGastos_ID_Empresa" on public."dCategoriaGastos" ("ID_Empresa");

-- 2) Replace fictitious audit text with real authenticated user IDs
update public."dEmpresas" set "Criado_Por"=null, "Atualizado_Por"=null;
update public."dClientes" set "Criado_Por"=null, "Atualizado_Por"=null;
update public."dObras" set "Criado_Por"=null, "Atualizado_Por"=null;
update public."dTrabalhadores" set "Criado_Por"=null, "Atualizado_Por"=null;
update public."dCategoriaGastos" set "Criado_Por"=null, "Atualizado_Por"=null;
update public."fRecebimentosObras" set "Criado_Por"=null, "Atualizado_Por"=null;
update public."fSaidasObras" set "Criado_Por"=null, "Atualizado_Por"=null;
update public."fPagamentosMaoDeObra" set "Criado_Por"=null, "Atualizado_Por"=null;

alter table public."dEmpresas"
  alter column "Criado_Por" type uuid using "Criado_Por"::uuid,
  alter column "Atualizado_Por" type uuid using "Atualizado_Por"::uuid;
alter table public."dClientes"
  alter column "Criado_Por" type uuid using "Criado_Por"::uuid,
  alter column "Atualizado_Por" type uuid using "Atualizado_Por"::uuid;
alter table public."dObras"
  alter column "Criado_Por" type uuid using "Criado_Por"::uuid,
  alter column "Atualizado_Por" type uuid using "Atualizado_Por"::uuid;
alter table public."dTrabalhadores"
  alter column "Criado_Por" type uuid using "Criado_Por"::uuid,
  alter column "Atualizado_Por" type uuid using "Atualizado_Por"::uuid;
alter table public."dCategoriaGastos"
  alter column "Criado_Por" type uuid using "Criado_Por"::uuid,
  alter column "Atualizado_Por" type uuid using "Atualizado_Por"::uuid;
alter table public."fRecebimentosObras"
  alter column "Criado_Por" type uuid using "Criado_Por"::uuid,
  alter column "Atualizado_Por" type uuid using "Atualizado_Por"::uuid;
alter table public."fSaidasObras"
  alter column "Criado_Por" type uuid using "Criado_Por"::uuid,
  alter column "Atualizado_Por" type uuid using "Atualizado_Por"::uuid;
alter table public."fPagamentosMaoDeObra"
  alter column "Criado_Por" type uuid using "Criado_Por"::uuid,
  alter column "Atualizado_Por" type uuid using "Atualizado_Por"::uuid;

-- Add audit foreign keys to dUsuarios
do $$
declare
  t text;
  c text;
  cname text;
begin
  foreach t in array array['dEmpresas','dClientes','dObras','dTrabalhadores','dCategoriaGastos','fRecebimentosObras','fSaidasObras','fPagamentosMaoDeObra']
  loop
    foreach c in array array['Criado_Por','Atualizado_Por']
    loop
      cname := t || '_' || c || '_fkey';
      if not exists (select 1 from pg_constraint where conname = cname) then
        execute format(
          'alter table public.%I add constraint %I foreign key (%I) references public."dUsuarios"("ID_Usuario") on delete set null',
          t, cname, c
        );
      end if;
    end loop;
  end loop;
end $$;

-- 3) Private authorization helpers
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create or replace function app_private.current_company_id()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select u."ID_Empresa"
  from public."dUsuarios" u
  where u."ID_Usuario" = (select auth.uid())
    and u."Status" = 'Ativo'
  limit 1
$$;

create or replace function app_private.current_profile()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select u."Perfil"
  from public."dUsuarios" u
  where u."ID_Usuario" = (select auth.uid())
    and u."Status" = 'Ativo'
  limit 1
$$;

revoke all on function app_private.current_company_id() from public, anon;
revoke all on function app_private.current_profile() from public, anon;
grant execute on function app_private.current_company_id() to authenticated;
grant execute on function app_private.current_profile() to authenticated;

-- 4) Automatic audit fields
create or replace function app_private.set_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new."Criado_Em" is null then
      new."Criado_Em" := now();
    end if;
    if new."Criado_Por" is null then
      new."Criado_Por" := (select auth.uid());
    end if;
  elsif tg_op = 'UPDATE' then
    new."Atualizado_Em" := now();
    new."Atualizado_Por" := (select auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function app_private.set_audit_fields() from public, anon, authenticated;

do $$
declare
  t text;
  trg text;
begin
  foreach t in array array['dEmpresas','dClientes','dObras','dTrabalhadores','dCategoriaGastos','fRecebimentosObras','fSaidasObras','fPagamentosMaoDeObra']
  loop
    trg := 'trg_audit_' || lower(t);
    execute format('drop trigger if exists %I on public.%I', trg, t);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function app_private.set_audit_fields()',
      trg, t
    );
  end loop;
end $$;

-- 5) API grants: RLS decides the actual rows/commands
revoke all on public."dEmpresas", public."dClientes", public."dObras",
  public."dTrabalhadores", public."dCategoriaGastos",
  public."fRecebimentosObras", public."fSaidasObras",
  public."fPagamentosMaoDeObra", public."dUsuarios" from anon;

grant select, insert, update, delete on public."dEmpresas", public."dClientes", public."dObras",
  public."dTrabalhadores", public."dCategoriaGastos",
  public."fRecebimentosObras", public."fSaidasObras",
  public."fPagamentosMaoDeObra", public."dUsuarios" to authenticated;

-- 6) Replace temporary lock policies
drop policy if exists "locked_until_auth_configured_dEmpresas" on public."dEmpresas";
drop policy if exists "locked_until_auth_configured_dClientes" on public."dClientes";
drop policy if exists "locked_until_auth_configured_dObras" on public."dObras";
drop policy if exists "locked_until_auth_configured_dTrabalhadores" on public."dTrabalhadores";
drop policy if exists "locked_until_auth_configured_dCategoriaGastos" on public."dCategoriaGastos";
drop policy if exists "locked_until_auth_configured_fRecebimentosObras" on public."fRecebimentosObras";
drop policy if exists "locked_until_auth_configured_fSaidasObras" on public."fSaidasObras";
drop policy if exists "locked_until_auth_configured_fPagamentosMaoDeObra" on public."fPagamentosMaoDeObra";

-- dUsuarios: user can see own profile; owner can manage users of same company
create policy "usuarios_select"
  on public."dUsuarios" for select to authenticated
  using (
    "ID_Usuario" = (select auth.uid())
    or (
      (select app_private.current_profile()) = 'owner'
      and "ID_Empresa" = (select app_private.current_company_id())
    )
  );

create policy "usuarios_insert_owner"
  on public."dUsuarios" for insert to authenticated
  with check (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

create policy "usuarios_update_owner"
  on public."dUsuarios" for update to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

create policy "usuarios_delete_owner"
  on public."dUsuarios" for delete to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
    and "ID_Usuario" <> (select auth.uid())
  );

-- dEmpresas
create policy "empresas_select"
  on public."dEmpresas" for select to authenticated
  using ("ID_Empresa" = (select app_private.current_company_id()));

create policy "empresas_update_owner"
  on public."dEmpresas" for update to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

-- Master data tables
create policy "clientes_select"
  on public."dClientes" for select to authenticated
  using ("ID_Empresa" = (select app_private.current_company_id()));
create policy "clientes_insert"
  on public."dClientes" for insert to authenticated
  with check (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  );
create policy "clientes_update"
  on public."dClientes" for update to authenticated
  using (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check ("ID_Empresa" = (select app_private.current_company_id()));
create policy "clientes_delete_owner"
  on public."dClientes" for delete to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

create policy "obras_select"
  on public."dObras" for select to authenticated
  using ("ID_Empresa" = (select app_private.current_company_id()));
create policy "obras_insert"
  on public."dObras" for insert to authenticated
  with check (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  );
create policy "obras_update"
  on public."dObras" for update to authenticated
  using (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check ("ID_Empresa" = (select app_private.current_company_id()));
create policy "obras_delete_owner"
  on public."dObras" for delete to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

create policy "trabalhadores_select"
  on public."dTrabalhadores" for select to authenticated
  using ("ID_Empresa" = (select app_private.current_company_id()));
create policy "trabalhadores_insert"
  on public."dTrabalhadores" for insert to authenticated
  with check (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  );
create policy "trabalhadores_update"
  on public."dTrabalhadores" for update to authenticated
  using (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check ("ID_Empresa" = (select app_private.current_company_id()));
create policy "trabalhadores_delete_owner"
  on public."dTrabalhadores" for delete to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

create policy "categorias_select"
  on public."dCategoriaGastos" for select to authenticated
  using ("ID_Empresa" = (select app_private.current_company_id()));
create policy "categorias_insert_owner_admin"
  on public."dCategoriaGastos" for insert to authenticated
  with check (
    (select app_private.current_profile()) in ('owner','admin')
    and "ID_Empresa" = (select app_private.current_company_id())
  );
create policy "categorias_update_owner_admin"
  on public."dCategoriaGastos" for update to authenticated
  using (
    (select app_private.current_profile()) in ('owner','admin')
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check ("ID_Empresa" = (select app_private.current_company_id()));
create policy "categorias_delete_owner"
  on public."dCategoriaGastos" for delete to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

-- Transaction tables
create policy "recebimentos_select"
  on public."fRecebimentosObras" for select to authenticated
  using ("ID_Empresa" = (select app_private.current_company_id()));
create policy "recebimentos_insert"
  on public."fRecebimentosObras" for insert to authenticated
  with check (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  );
create policy "recebimentos_update"
  on public."fRecebimentosObras" for update to authenticated
  using (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check ("ID_Empresa" = (select app_private.current_company_id()));
create policy "recebimentos_delete_owner"
  on public."fRecebimentosObras" for delete to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

create policy "saidas_select"
  on public."fSaidasObras" for select to authenticated
  using ("ID_Empresa" = (select app_private.current_company_id()));
create policy "saidas_insert"
  on public."fSaidasObras" for insert to authenticated
  with check (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  );
create policy "saidas_update"
  on public."fSaidasObras" for update to authenticated
  using (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check ("ID_Empresa" = (select app_private.current_company_id()));
create policy "saidas_delete_owner"
  on public."fSaidasObras" for delete to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

create policy "pagamentos_select"
  on public."fPagamentosMaoDeObra" for select to authenticated
  using ("ID_Empresa" = (select app_private.current_company_id()));
create policy "pagamentos_insert"
  on public."fPagamentosMaoDeObra" for insert to authenticated
  with check (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  );
create policy "pagamentos_update"
  on public."fPagamentosMaoDeObra" for update to authenticated
  using (
    (select app_private.current_profile()) in ('owner','admin','operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check ("ID_Empresa" = (select app_private.current_company_id()));
create policy "pagamentos_delete_owner"
  on public."fPagamentosMaoDeObra" for delete to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );
