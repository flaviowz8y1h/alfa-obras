alter table public."fPagamentosMaoDeObra"
  add column "Dias_Trabalhados" date[];

comment on column public."fPagamentosMaoDeObra"."Dias_Trabalhados" is
  'Datas efetivamente selecionadas nas diárias. NULL indica quantidade manual ou registro antigo sem datas exatas.';

alter table public."fPagamentosMaoDeObra"
  add constraint "fPagamentosMaoDeObra_dias_selecionados_check"
  check (
    "Dias_Trabalhados" is null or (
      "Tipo_Pagamento" = 'Diária'
      and "Periodo_Inicio" is not null and "Periodo_Fim" is not null
      and "Quantidade_Dias" is not null
      and cardinality("Dias_Trabalhados") = "Quantidade_Dias"
      and array_position("Dias_Trabalhados", null) is null
    )
  );

-- Não preencher registros antigos: a quantidade não revela quais datas foram escolhidas.
