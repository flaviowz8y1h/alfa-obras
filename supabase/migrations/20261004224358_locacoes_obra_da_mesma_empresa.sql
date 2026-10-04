-- Mesmo padrão de isolar_vinculos_por_empresa: a obra da locação tem de ser da mesma empresa.
-- ID_Obra nulo (equipamento da empresa) continua permitido (MATCH SIMPLE).
alter table public."fLocacoes" drop constraint "fLocacoes_ID_Obra_fkey";
alter table public."fLocacoes" add constraint "fLocacoes_ID_Obra_fkey"
  foreign key ("ID_Empresa", "ID_Obra") references public."dObras" ("ID_Empresa", "ID_Obra");
drop index if exists public."idx_fLocacoes_ID_Obra";
create index if not exists "idx_fLocacoes_empresa_obra" on public."fLocacoes" ("ID_Empresa", "ID_Obra");
notify pgrst, 'reload schema';
