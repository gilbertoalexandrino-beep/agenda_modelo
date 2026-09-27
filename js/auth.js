/* ============================================================
   auth.js
   Login e logout via Supabase Auth.
   ============================================================ */

const Auth = {
    init() {
        const form = document.getElementById('form-login');
        form.addEventListener('submit', Auth.handleLogin);
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const senha = document.getElementById('login-senha').value;
        const btn = document.getElementById('btn-login');
        const erroEl = document.getElementById('login-erro');

        erroEl.hidden = true;
        btn.disabled = true;
        btn.textContent = 'Entrando...';

        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });

        btn.disabled = false;
        btn.textContent = 'Entrar';

        if (error) {
            Auth.mostrarErroLogin('E-mail ou senha inválidos.');
            return;
        }

        await App.afterLogin(data.session);
    },

    mostrarErroLogin(msg) {
        const erroEl = document.getElementById('login-erro');
        erroEl.textContent = msg;
        erroEl.hidden = false;
    },
};

document.addEventListener('DOMContentLoaded', Auth.init);
