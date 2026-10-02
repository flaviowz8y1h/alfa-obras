create table if not exists public."dUsuarios" (
  "ID_Usuario" uuid primary key references auth.users(id) on delete restrict,
  "Nome" text,
  "ID_Empresa" text not null references public."dEmpresas"("ID_Empresa"),
  "Perfil" text not null check ("Perfil" in ('owner','admin','operacional')),
  "Status" text not null default 'Ativo' check ("Status" in ('Ativo','Inativo')),
  "Criado_Em" timestamptz not null default now(),
  "Atualizado_Em" timestamptz
);

comment on table public."dUsuarios" is 'Perfis de acesso dos usuários autenticados do sistema';

alter table public."dUsuarios" enable row level security;

create index if not exists "idx_dUsuarios_ID_Empresa"
  on public."dUsuarios" ("ID_Empresa");

insert into public."dUsuarios"
  ("ID_Usuario","Nome","ID_Empresa","Perfil","Status")
values
  ('ea0eef4b-3ade-407f-8ea1-c6edce95f4f7', null, 'EM01', 'owner', 'Ativo')
on conflict ("ID_Usuario") do update
  set "ID_Empresa" = excluded."ID_Empresa",
      "Perfil" = 'owner',
      "Status" = 'Ativo';
