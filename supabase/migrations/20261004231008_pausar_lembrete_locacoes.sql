-- Envio diário por e-mail adiado pelo cliente: remove só o agendamento.
-- A Edge Function lembrete-locacoes, as RPCs e o token continuam prontos; para reativar,
-- refazer o cron.schedule de 20261004225842_lembrete_locacoes.sql.
select cron.unschedule('lembrete-locacoes')
where exists (select 1 from cron.job where jobname = 'lembrete-locacoes');
