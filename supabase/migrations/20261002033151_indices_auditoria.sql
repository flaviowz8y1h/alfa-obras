-- Índices nas FKs de auditoria (Criado_Por / Atualizado_Por -> dUsuarios),
-- apontados pelo advisor "unindexed_foreign_keys".
do $$
declare
  t text;
  c text;
begin
  foreach t in array array['dEmpresas','dClientes','dObras','dTrabalhadores','dCategoriaGastos','fRecebimentosObras','fSaidasObras','fPagamentosMaoDeObra']
  loop
    foreach c in array array['Criado_Por','Atualizado_Por']
    loop
      execute format('create index if not exists %I on public.%I (%I)', 'idx_' || t || '_' || c, t, c);
    end loop;
  end loop;
end $$;
