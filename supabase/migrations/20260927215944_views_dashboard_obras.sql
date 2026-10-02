create or replace view public.vw_resumo_obras
with (security_invoker = on) as
select
  o."ID_Obra", o."ID_Empresa", o."Nome_Obra", o."Status",
  c."Nome_Cliente",
  o."Data_Inicio", o."Previsao_Termino",
  coalesce(o."Valor_Contratado", 0) as valor_contratado,
  coalesce(r.total, 0) as total_recebido,
  coalesce(s.total, 0) as total_saidas,
  coalesce(p.total, 0) as total_mao_de_obra,
  coalesce(s.total, 0) + coalesce(p.total, 0) as custo_total,
  coalesce(r.total, 0) - (coalesce(s.total, 0) + coalesce(p.total, 0)) as saldo_caixa,
  coalesce(o."Valor_Contratado", 0) - coalesce(r.total, 0) as a_receber,
  coalesce(o."Valor_Contratado", 0) - (coalesce(s.total, 0) + coalesce(p.total, 0)) as margem_prevista
from public."dObras" o
left join public."dClientes" c on c."ID_Cliente" = o."ID_Cliente"
left join (select "ID_Obra", sum("Valor_Recebido") total from public."fRecebimentosObras" group by 1) r on r."ID_Obra" = o."ID_Obra"
left join (select "ID_Obra", sum("Valor") total from public."fSaidasObras" group by 1) s on s."ID_Obra" = o."ID_Obra"
left join (select "ID_Obra", sum("Valor_Pago") total from public."fPagamentosMaoDeObra" group by 1) p on p."ID_Obra" = o."ID_Obra";

create or replace view public.vw_fluxo_mensal
with (security_invoker = on) as
select "ID_Empresa", "ID_Obra", date_trunc('month', data)::date as mes,
       sum(entrada) as entradas, sum(saida) as saidas, sum(entrada) - sum(saida) as saldo
from (
  select "ID_Empresa", "ID_Obra", "Data_Recebimento" as data, "Valor_Recebido" as entrada, 0::numeric as saida from public."fRecebimentosObras"
  union all
  select "ID_Empresa", "ID_Obra", "Data_Saida", 0::numeric, "Valor" from public."fSaidasObras"
  union all
  select "ID_Empresa", "ID_Obra", "Data_Pagamento", 0::numeric, "Valor_Pago" from public."fPagamentosMaoDeObra"
) t
group by 1, 2, 3;

revoke all on public.vw_resumo_obras, public.vw_fluxo_mensal from anon;
grant select on public.vw_resumo_obras, public.vw_fluxo_mensal to authenticated;
