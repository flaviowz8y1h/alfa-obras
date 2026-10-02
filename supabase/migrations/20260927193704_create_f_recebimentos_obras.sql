create table if not exists public."fRecebimentosObras" (
  "ID_Recebimento" text primary key,
  "ID_Empresa" text not null,
  "ID_Obra" text not null,
  "Data_Recebimento" date,
  "Valor_Recebido" numeric(12,2),
  "Forma_Pagamento" text,
  "Observacao" text,
  "Criado_Em" timestamptz not null default now(),
  "Criado_Por" text,
  "Atualizado_Em" timestamptz,
  "Atualizado_Por" text,
  constraint "fRecebimentosObras_ID_Empresa_fkey"
    foreign key ("ID_Empresa") references public."dEmpresas"("ID_Empresa"),
  constraint "fRecebimentosObras_ID_Obra_fkey"
    foreign key ("ID_Obra") references public."dObras"("ID_Obra")
);

comment on table public."fRecebimentosObras" is 'Recebimentos financeiros vinculados às obras';

alter table public."fRecebimentosObras" enable row level security;

create index if not exists "idx_fRecebimentosObras_ID_Empresa"
  on public."fRecebimentosObras" ("ID_Empresa");

create index if not exists "idx_fRecebimentosObras_ID_Obra"
  on public."fRecebimentosObras" ("ID_Obra");
