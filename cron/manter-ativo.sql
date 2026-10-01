-- Ativa o agendador de tarefas do banco
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Executa uma consulta simples periodicamente para manter o banco ativo
SELECT cron.schedule(
  'mantem-banco-ativo',
  '0 0 */5 * *',  -- Executa de 5 em 5 dias do mês, à meia-noite
  'SELECT 1;'
);
