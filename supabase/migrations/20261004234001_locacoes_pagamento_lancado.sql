-- Liga a locação à saída que pagou a locadora: evita lançar duas vezes e mostra o que falta lançar.
alter table public."fSaidasObras" add constraint "fSaidasObras_empresa_id_key" unique ("ID_Empresa", "ID_Saida");
alter table public."fLocacoes" add column if not exists "ID_Saida" text;
-- saída excluída: a locação volta a "pagamento não lançado" (só o ID_Saida vira nulo)
alter table public."fLocacoes" add constraint "fLocacoes_ID_Saida_fkey"
  foreign key ("ID_Empresa", "ID_Saida") references public."fSaidasObras" ("ID_Empresa", "ID_Saida")
  on delete set null ("ID_Saida");
create index if not exists "idx_fLocacoes_empresa_saida" on public."fLocacoes" ("ID_Empresa", "ID_Saida");
notify pgrst, 'reload schema';
