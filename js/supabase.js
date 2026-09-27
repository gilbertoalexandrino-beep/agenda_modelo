/* ============================================================
   supabase.js
   Configuração da conexão com o Supabase.

   IMPORTANTE:
   - Utilize somente a URL pública do projeto e a chave
     "anon" / "publishable".
   - NUNCA utilize a "service_role" no frontend.
   ============================================================ */

const SUPABASE_URL = 'https://sennhswojctnrghuelcx.supabase.co';

const SUPABASE_ANON_KEY = 'sb_publishable_6YIjpPXbiBiv0Zhy3G7C3w_1J4UNwLl';

// O objeto global `supabase` vem do script carregado via CDN
// no index.html.
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
