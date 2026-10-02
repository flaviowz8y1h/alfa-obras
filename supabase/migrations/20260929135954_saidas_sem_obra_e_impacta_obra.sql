alter table public."fSaidasObras" alter column "ID_Obra" drop not null;

create or replace view public.vw_resumo_obras with (security_invoker = on) as
select
  o."ID_Obra",
  o."ID_Empresa",
  o."Nome_Obra",
  o."Status",
  c."Nome_Cliente",
  o."Data_Inicio",
  o."Previsao_Termino",
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
left join (
  select "ID_Obra", sum("Valor_Recebido") as total
  from public."fRecebimentosObras"
  group by "ID_Obra"
) r on r."ID_Obra" = o."ID_Obra"
left join (
  select s."ID_Obra", sum(s."Valor") as total
  from public."fSaidasObras" s
  join public."dCategoriaGastos" k on k."ID_Categoria" = s."ID_Categoria"
  where s."ID_Obra" is not null
    and k."Impacta_Obra" is distinct from 'Não'
  group by s."ID_Obra"
) s on s."ID_Obra" = o."ID_Obra"
left join (
  select "ID_Obra", sum("Valor_Pago") as total
  from public."fPagamentosMaoDeObra"
  group by "ID_Obra"
) p on p."ID_Obra" = o."ID_Obra";

create or replace view public.vw_fluxo_mensal with (security_invoker = on) as
select
  "ID_Empresa",
  "ID_Obra",
  date_trunc('month', data::timestamptz)::date as mes,
  sum(entrada) as entradas,
  sum(saida) as saidas,
  sum(entrada) - sum(saida) as saldo
from (
  select "ID_Empresa", "ID_Obra", "Data_Recebimento" as data, "Valor_Recebido" as entrada, 0::numeric as saida
  from public."fRecebimentosObras"
  union all
  select s."ID_Empresa",
         case when k."Impacta_Obra" = 'Não' then null else s."ID_Obra" end,
         s."Data_Saida", 0::numeric, s."Valor"
  from public."fSaidasObras" s
  join public."dCategoriaGastos" k on k."ID_Categoria" = s."ID_Categoria"
  union all
  select "ID_Empresa", "ID_Obra", "Data_Pagamento", 0::numeric, "Valor_Pago"
  from public."fPagamentosMaoDeObra"
) t
group by "ID_Empresa", "ID_Obra", date_trunc('month', data::timestamptz)::date;
