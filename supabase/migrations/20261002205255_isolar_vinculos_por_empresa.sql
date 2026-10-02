-- Impede vínculos entre registros de empresas diferentes.
-- Mantém os nomes das relações para preservar os joins do PostgREST.
alter table public."dClientes" add constraint "dClientes_empresa_id_key" unique ("ID_Empresa","ID_Cliente");
alter table public."dObras" add constraint "dObras_empresa_id_key" unique ("ID_Empresa","ID_Obra");
alter table public."dTrabalhadores" add constraint "dTrabalhadores_empresa_id_key" unique ("ID_Empresa","ID_Trabalhador");
alter table public."dCategoriaGastos" add constraint "dCategoriaGastos_empresa_id_key" unique ("ID_Empresa","ID_Categoria");
alter table public."dObras" drop constraint "dObras_ID_Cliente_fkey";
alter table public."dObras" add constraint "dObras_ID_Cliente_fkey" foreign key ("ID_Empresa","ID_Cliente") references public."dClientes" ("ID_Empresa","ID_Cliente");
alter table public."fRecebimentosObras" drop constraint "fRecebimentosObras_ID_Obra_fkey";
alter table public."fRecebimentosObras" add constraint "fRecebimentosObras_ID_Obra_fkey" foreign key ("ID_Empresa","ID_Obra") references public."dObras" ("ID_Empresa","ID_Obra");
alter table public."fSaidasObras" drop constraint "fSaidasObras_ID_Obra_fkey";
alter table public."fSaidasObras" add constraint "fSaidasObras_ID_Obra_fkey" foreign key ("ID_Empresa","ID_Obra") references public."dObras" ("ID_Empresa","ID_Obra");
alter table public."fSaidasObras" drop constraint "fSaidasObras_ID_Categoria_fkey";
alter table public."fSaidasObras" add constraint "fSaidasObras_ID_Categoria_fkey" foreign key ("ID_Empresa","ID_Categoria") references public."dCategoriaGastos" ("ID_Empresa","ID_Categoria");
alter table public."fPagamentosMaoDeObra" drop constraint "fPagamentosMaoDeObra_ID_Obra_fkey";
alter table public."fPagamentosMaoDeObra" add constraint "fPagamentosMaoDeObra_ID_Obra_fkey" foreign key ("ID_Empresa","ID_Obra") references public."dObras" ("ID_Empresa","ID_Obra");
alter table public."fPagamentosMaoDeObra" drop constraint "fPagamentosMaoDeObra_ID_Trabalhador_fkey";
alter table public."fPagamentosMaoDeObra" add constraint "fPagamentosMaoDeObra_ID_Trabalhador_fkey" foreign key ("ID_Empresa","ID_Trabalhador") references public."dTrabalhadores" ("ID_Empresa","ID_Trabalhador");
notify pgrst, 'reload schema';
