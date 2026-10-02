-- Baseline: tabelas criadas pelo painel antes do histórico de migrations.
-- Reconstruída a partir do banco em produção. As migrations seguintes ajustam
-- estes campos (ID_Empresa em dClientes, Criado_Por/Atualizado_Por -> uuid, etc.).
-- Não está registrada em supabase_migrations no projeto remoto.

create table if not exists public."dEmpresas" (
  "ID_Empresa" text primary key,
  "Criado_Em" timestamptz not null default now(),
  "Nome_Empresa" text,
  "CNPJ_CPF" text,
  "Status" text default 'Ativo',
  "Criado_Por" text,
  "Atualizado_Em" timestamp,
  "Atualizado_Por" text
);
comment on table public."dEmpresas" is 'Cadastro das empresas gerenciadas pelo sistema';
alter table public."dEmpresas" enable row level security;

create table if not exists public."dClientes" (
  "ID_Cliente" text primary key,
  "Criado_Em" timestamptz not null default now(),
  "Nome_Cliente" text,
  "Telefone_Cliente" text,
  "Status" text default 'Ativo',
  "Criado_Por" text,
  "Atualizado_Em" timestamptz,
  "Atualizado_Por" text
);
comment on table public."dClientes" is 'Cadastro dos clientes vinculados às obras da empresa';
alter table public."dClientes" enable row level security;

create table if not exists public."dObras" (
  "ID_Obra" text primary key,
  "Criado_Em" timestamptz not null default now(),
  "ID_Empresa" text constraint "dObras_ID_Empresa_fkey" references public."dEmpresas"("ID_Empresa"),
  "ID_Cliente" text constraint "dObras_ID_Cliente_fkey" references public."dClientes"("ID_Cliente"),
  "Nome_Obra" text,
  "Valor_Contratado" numeric,
  "Data_Inicio" date,
  "Previsao_Termino" date,
  "Status" text default 'Em Andamento',
  "Criado_Por" text,
  "Atualizado_Em" timestamptz,
  "Atualizado_Por" text
);
comment on table public."dObras" is 'Cadastro e informações gerais das obras';
alter table public."dObras" enable row level security;
