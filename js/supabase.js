/* ============================================================
   supabase.js
   Configuração da conexão com o Supabase.

   IMPORTANTE:
   - Utilize somente a URL pública do projeto e a chave
     "anon" / "publishable".
   - NUNCA utilize a "service_role" no frontend.
   ============================================================ */

const SUPABASE_URL = 'cole a url do seu projeto aqui entre as aspas';

const SUPABASE_ANON_KEY = 'cole a anon key do seu projeto aqui entre as aspas';

// O objeto global `supabase` vem do script carregado via CDN
// no index.html.
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
