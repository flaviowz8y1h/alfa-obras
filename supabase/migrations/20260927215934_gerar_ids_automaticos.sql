create sequence if not exists app_private.seq_empresa;
create sequence if not exists app_private.seq_cliente;
create sequence if not exists app_private.seq_obra;
create sequence if not exists app_private.seq_trabalhador;
create sequence if not exists app_private.seq_categoria;
create sequence if not exists app_private.seq_recebimento;
create sequence if not exists app_private.seq_saida;
create sequence if not exists app_private.seq_pagamento;

select setval('app_private.seq_empresa',     coalesce((select max(substring("ID_Empresa" from '\d+$')::int)     from public."dEmpresas"), 0) + 1, false);
select setval('app_private.seq_cliente',     coalesce((select max(substring("ID_Cliente" from '\d+$')::int)     from public."dClientes"), 0) + 1, false);
select setval('app_private.seq_obra',        coalesce((select max(substring("ID_Obra" from '\d+$')::int)        from public."dObras"), 0) + 1, false);
select setval('app_private.seq_trabalhador', coalesce((select max(substring("ID_Trabalhador" from '\d+$')::int) from public."dTrabalhadores"), 0) + 1, false);
select setval('app_private.seq_categoria',   coalesce((select max(substring("ID_Categoria" from '\d+$')::int)   from public."dCategoriaGastos"), 0) + 1, false);
select setval('app_private.seq_recebimento', coalesce((select max(substring("ID_Recebimento" from '\d+$')::int) from public."fRecebimentosObras"), 0) + 1, false);
select setval('app_private.seq_saida',       coalesce((select max(substring("ID_Saida" from '\d+$')::int)       from public."fSaidasObras"), 0) + 1, false);
select setval('app_private.seq_pagamento',   coalesce((select max(substring("ID_Pagamento" from '\d+$')::int)   from public."fPagamentosMaoDeObra"), 0) + 1, false);

create or replace function app_private.gerar_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_col text := tg_argv[0];
  v_n   bigint;
  v_num text;
begin
  if coalesce(to_jsonb(new) ->> v_col, '') <> '' then
    return new;
  end if;
  v_n   := nextval(tg_argv[3]::regclass);
  v_num := lpad(v_n::text, greatest(tg_argv[2]::int, length(v_n::text)), '0');
  new   := jsonb_populate_record(new, jsonb_build_object(v_col, tg_argv[1] || v_num));
  return new;
end;
$$;

revoke execute on function app_private.gerar_id() from public, anon, authenticated;

create trigger trg_id_dempresas        before insert on public."dEmpresas"            for each row execute function app_private.gerar_id('ID_Empresa',     'EM',   '2', 'app_private.seq_empresa');
create trigger trg_id_dclientes        before insert on public."dClientes"            for each row execute function app_private.gerar_id('ID_Cliente',     'CLI',  '3', 'app_private.seq_cliente');
create trigger trg_id_dobras           before insert on public."dObras"               for each row execute function app_private.gerar_id('ID_Obra',        'OBR',  '3', 'app_private.seq_obra');
create trigger trg_id_dtrabalhadores   before insert on public."dTrabalhadores"       for each row execute function app_private.gerar_id('ID_Trabalhador', 'TRAB', '3', 'app_private.seq_trabalhador');
create trigger trg_id_dcategoriagastos before insert on public."dCategoriaGastos"     for each row execute function app_private.gerar_id('ID_Categoria',   'CAT',  '4', 'app_private.seq_categoria');
create trigger trg_id_frecebimentos    before insert on public."fRecebimentosObras"   for each row execute function app_private.gerar_id('ID_Recebimento', 'REC',  '4', 'app_private.seq_recebimento');
create trigger trg_id_fsaidas          before insert on public."fSaidasObras"         for each row execute function app_private.gerar_id('ID_Saida',       'SAI',  '4', 'app_private.seq_saida');
create trigger trg_id_fpagamentos      before insert on public."fPagamentosMaoDeObra" for each row execute function app_private.gerar_id('ID_Pagamento',   'PAG',  '4', 'app_private.seq_pagamento');
