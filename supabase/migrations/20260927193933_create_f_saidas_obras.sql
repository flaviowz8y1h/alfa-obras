create table if not exists public."fSaidasObras" (
  "ID_Saida" text primary key,
  "ID_Empresa" text not null,
  "ID_Obra" text not null,
  "ID_Categoria" text not null,
  "Data_Saida" date,
  "Valor" numeric(12,2),
  "Forma_Pagamento" text,
  "Fornecedor_Local" text,
  "Descricao" text,
  "Numero_Nota_Fiscal" text,
  "Comprovante_URL" text,
  "Criado_Em" timestamptz not null default now(),
  "Criado_Por" text,
  "Atualizado_Em" timestamptz,
  "Atualizado_Por" text,
  constraint "fSaidasObras_ID_Empresa_fkey"
    foreign key ("ID_Empresa") references public."dEmpresas"("ID_Empresa"),
  constraint "fSaidasObras_ID_Obra_fkey"
    foreign key ("ID_Obra") references public."dObras"("ID_Obra"),
  constraint "fSaidasObras_ID_Categoria_fkey"
    foreign key ("ID_Categoria") references public."dCategoriaGastos"("ID_Categoria")
);

comment on table public."fSaidasObras" is 'Saídas e despesas financeiras vinculadas às obras';

alter table public."fSaidasObras" enable row level security;

create index if not exists "idx_fSaidasObras_ID_Empresa"
  on public."fSaidasObras" ("ID_Empresa");

create index if not exists "idx_fSaidasObras_ID_Obra"
  on public."fSaidasObras" ("ID_Obra");

create index if not exists "idx_fSaidasObras_ID_Categoria"
  on public."fSaidasObras" ("ID_Categoria");
