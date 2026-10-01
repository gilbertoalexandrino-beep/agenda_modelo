-- Habilita o pg_cron para agendamentos
create extension if not exists pg_cron;

-- Habilita o pg_net para permitir que o banco faça requisições HTTP
create extension if not exists pg_net;

create or replace function manter_banco_ativo()
returns void as $$
declare
    supabase_url text := 'https://SEU_PROJETO.supabase.co'; -- Substitua pelo link do seu projeto
    anon_key text := 'SUA_CHAVE_ANON_AQUI';                  -- Substitua pela sua chave anon/public
begin
    -- Realiza uma requisição HTTP GET para uma tabela qualquer (ex: profiles)
    perform net.http_get(
        url := supabase_url || '/rest/v1/profiles?limit=1',
        headers := jsonb_build_object(
            'apikey', anon_key,
            'Authorization', 'Bearer ' || anon_key
        )
    );
end;
$$ language plpgsql security definer;

-- Agenda a função para rodar a cada 3 dias (às 00:00)
select cron.schedule(
    'keep-alive-supabase',   -- Nome do job
    '0 0 */3 * *',          -- Expressão Cron (A cada 3 dias)
    'select manter_banco_ativo();'
);
