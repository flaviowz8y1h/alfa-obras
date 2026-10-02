create index if not exists "idx_dObras_ID_Empresa"
  on public."dObras" ("ID_Empresa");

create index if not exists "idx_dObras_ID_Cliente"
  on public."dObras" ("ID_Cliente");

alter table public."dEmpresas"
  alter column "Atualizado_Em" type timestamptz
  using "Atualizado_Em" at time zone 'America/Sao_Paulo';

-- rls_auto_enable() é criada pelo próprio Supabase (event trigger ensure_rls).
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

create policy "locked_until_auth_configured_dEmpresas"
  on public."dEmpresas" for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "locked_until_auth_configured_dClientes"
  on public."dClientes" for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "locked_until_auth_configured_dObras"
  on public."dObras" for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "locked_until_auth_configured_dTrabalhadores"
  on public."dTrabalhadores" for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "locked_until_auth_configured_dCategoriaGastos"
  on public."dCategoriaGastos" for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "locked_until_auth_configured_fRecebimentosObras"
  on public."fRecebimentosObras" for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "locked_until_auth_configured_fSaidasObras"
  on public."fSaidasObras" for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "locked_until_auth_configured_fPagamentosMaoDeObra"
  on public."fPagamentosMaoDeObra" for all
  to anon, authenticated
  using (false)
  with check (false);
