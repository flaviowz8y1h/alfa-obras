create table if not exists public."dCategoriaGastos" (
  "ID_Categoria" text primary key,
  "Nome_Categoria" text,
  "Grupo_DRE" text,
  "Tipo_Custo" text,
  "Impacta_Obra" text,
  "Status" text default 'Ativo',
  "Criado_Em" timestamptz not null default now(),
  "Criado_Por" text,
  "Atualizado_Em" timestamptz,
  "Atualizado_Por" text
);

comment on table public."dCategoriaGastos" is 'Cadastro das categorias de gastos e classificação para DRE';

alter table public."dCategoriaGastos" enable row level security;
