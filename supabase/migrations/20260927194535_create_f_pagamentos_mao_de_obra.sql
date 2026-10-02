create table if not exists public."fPagamentosMaoDeObra" (
  "ID_Pagamento" text primary key,
  "ID_Empresa" text not null,
  "ID_Obra" text not null,
  "ID_Trabalhador" text not null,
  "Data_Pagamento" date,
  "Tipo_Pagamento" text,
  "Valor_Pago" numeric(12,2),
  "Forma_Pagamento" text,
  "Observacao" text,
  "Criado_Em" timestamptz not null default now(),
  "Criado_Por" text,
  "Periodo_Inicio" date,
  "Periodo_Fim" date,
  "Quantidade_Dias" numeric(10,2),
  "Valor_Diaria_Aplicado" numeric(12,2),
  "Atualizado_Em" timestamptz,
  "Atualizado_Por" text,
  constraint "fPagamentosMaoDeObra_ID_Empresa_fkey"
    foreign key ("ID_Empresa") references public."dEmpresas"("ID_Empresa"),
  constraint "fPagamentosMaoDeObra_ID_Obra_fkey"
    foreign key ("ID_Obra") references public."dObras"("ID_Obra"),
  constraint "fPagamentosMaoDeObra_ID_Trabalhador_fkey"
    foreign key ("ID_Trabalhador") references public."dTrabalhadores"("ID_Trabalhador")
);

comment on table public."fPagamentosMaoDeObra" is 'Pagamentos de mão de obra vinculados às obras e trabalhadores';

alter table public."fPagamentosMaoDeObra" enable row level security;

create index if not exists "idx_fPagamentosMaoDeObra_ID_Empresa"
  on public."fPagamentosMaoDeObra" ("ID_Empresa");

create index if not exists "idx_fPagamentosMaoDeObra_ID_Obra"
  on public."fPagamentosMaoDeObra" ("ID_Obra");

create index if not exists "idx_fPagamentosMaoDeObra_ID_Trabalhador"
  on public."fPagamentosMaoDeObra" ("ID_Trabalhador");
