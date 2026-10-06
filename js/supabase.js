/* ============================================================
   supabase.js
   Configuração da conexão com o Supabase.

   IMPORTANTE:
   - Utilize somente a URL pública do projeto e a chave
     "anon" / "publishable".
   - NUNCA utilize a "service_role" no frontend.
   ============================================================ */

const SUPABASE_URL = 'https://wvyecullktdrspjkszdw.supabase.co/rest/v1/s';

const SUPABASE_ANON_KEY = 'sb_publishable_63XdPoD89gbB8m9Jaa4GWQ_6ArUef1I';

// O objeto global `supabase` vem do script carregado via CDN
// no index.html.
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
