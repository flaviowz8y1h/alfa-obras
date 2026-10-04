-- Locações de equipamentos (betoneira, andaime, martelete…) com data de devolução,
-- para o sistema lembrar antes de vencer. Segue o padrão das outras tabelas:
-- empresa do usuário logado na RLS, owner com aal2, ID automático e auditoria.

create table if not exists public."fLocacoes" (
  "ID_Locacao" text primary key,
  "ID_Empresa" text not null references public."dEmpresas"("ID_Empresa"),
  -- sem obra = equipamento da empresa (depósito, várias obras)
  "ID_Obra" text references public."dObras"("ID_Obra"),
  "Equipamento" text not null check (length(trim("Equipamento")) > 0),
  "Quantidade" numeric(10,2) not null default 1 check ("Quantidade" > 0),
  "Locadora" text,
  "Telefone_Locadora" text,
  "Data_Retirada" date not null,
  "Data_Devolucao_Prevista" date not null,
  -- preenchida quando o equipamento volta; vazia = locação ativa
  "Data_Devolucao" date,
  "Valor" numeric(12,2) check ("Valor" >= 0),
  "Cobranca" text check ("Cobranca" in ('Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Valor fechado')),
  "Observacao" text,
  "Criado_Em" timestamptz not null default now(),
  "Criado_Por" uuid references public."dUsuarios"("ID_Usuario") on delete set null,
  "Atualizado_Em" timestamptz,
  "Atualizado_Por" uuid references public."dUsuarios"("ID_Usuario") on delete set null,
  constraint "fLocacoes_prevista_apos_retirada" check ("Data_Devolucao_Prevista" >= "Data_Retirada"),
  constraint "fLocacoes_devolucao_apos_retirada" check ("Data_Devolucao" is null or "Data_Devolucao" >= "Data_Retirada")
);

comment on table public."fLocacoes" is 'Locações de equipamentos com prazo de devolução';

alter table public."fLocacoes" enable row level security;

create index if not exists "idx_fLocacoes_ID_Empresa" on public."fLocacoes" ("ID_Empresa");
create index if not exists "idx_fLocacoes_ID_Obra" on public."fLocacoes" ("ID_Obra");
create index if not exists "idx_fLocacoes_Criado_Por" on public."fLocacoes" ("Criado_Por");
create index if not exists "idx_fLocacoes_Atualizado_Por" on public."fLocacoes" ("Atualizado_Por");
-- alertas: locações ativas ordenadas pelo vencimento
create index if not exists "idx_fLocacoes_ativas_prevista"
  on public."fLocacoes" ("ID_Empresa", "Data_Devolucao_Prevista")
  where "Data_Devolucao" is null;

-- ID automático: LOC0001, LOC0002…
create sequence if not exists app_private.seq_locacao;
create trigger trg_id_flocacoes before insert on public."fLocacoes"
  for each row execute function app_private.gerar_id('ID_Locacao', 'LOC', '4', 'app_private.seq_locacao');

-- Criado_Por / Atualizado_Por / datas
create trigger trg_audit_flocacoes before insert or update on public."fLocacoes"
  for each row execute function app_private.set_audit_fields();

revoke all on public."fLocacoes" from anon;
grant select, insert, update, delete on public."fLocacoes" to authenticated;

create policy locacoes_select on public."fLocacoes" for select to authenticated
  using ("ID_Empresa" = (select app_private.current_company_id()));

create policy locacoes_insert on public."fLocacoes" for insert to authenticated
  with check (
    (select app_private.current_profile()) in ('owner', 'admin', 'operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  );

-- Quem está na obra precisa marcar "devolvi" e prorrogar: todos os perfis editam.
create policy locacoes_update on public."fLocacoes" for update to authenticated
  using (
    (select app_private.current_profile()) in ('owner', 'admin', 'operacional')
    and "ID_Empresa" = (select app_private.current_company_id())
  )
  with check ("ID_Empresa" = (select app_private.current_company_id()));

create policy locacoes_delete_owner on public."fLocacoes" for delete to authenticated
  using (
    (select app_private.current_profile()) = 'owner'
    and "ID_Empresa" = (select app_private.current_company_id())
  );

create policy require_owner_aal2_flocacoes on public."fLocacoes" as restrictive for all to authenticated
  using ((select app_private.owner_mfa_ok()))
  with check ((select app_private.owner_mfa_ok()));
