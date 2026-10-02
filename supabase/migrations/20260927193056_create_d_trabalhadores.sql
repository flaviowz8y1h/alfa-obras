create table if not exists public."dTrabalhadores" (
  "ID_Trabalhador" text primary key,
  "Nome_Trabalhador" text,
  "Funcao" text,
  "Tipo_Vinc_Contrato" text,
  "Valor_Diaria_Padrao" numeric(12,2),
  "Chave_PIX" text,
  "Status" text default 'Ativo',
  "Criado_Em" timestamptz not null default now(),
  "Criado_Por" text,
  "Atualizado_Em" timestamptz,
  "Atualizado_Por" text
);

comment on table public."dTrabalhadores" is 'Cadastro dos trabalhadores vinculados às obras';

alter table public."dTrabalhadores" enable row level security;
