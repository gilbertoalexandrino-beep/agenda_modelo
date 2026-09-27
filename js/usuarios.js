/* ============================================================
   usuarios.js
   Tela "Cadastro" (somente ADM).
   - Editar: UPDATE direto em public.usuarios (RLS protege).
   - Criar:  chama a Edge Function "criar-usuario", que usa
             SERVICE_ROLE no servidor para criar o usuário em
             auth.users + completar public.usuarios.
   ============================================================ */

const Usuarios = {
    editando: true,   // true = edição; false = criação

    async render() {
        const container = document.getElementById('view-cadastro');
        container.innerHTML = `
            <div class="view-cabecalho view-cabecalho-acao">
                <div>
                    <h1>Cadastro de usuários</h1>
                    <p class="subtitulo">Crie e gerencie os usuários da rede.</p>
                </div>
                <button class="btn btn-primario" id="btn-novo-usuario">+ Novo usuário</button>
            </div>
            <div id="usu-lista"><div class="carregando">Carregando usuários...</div></div>
        `;

        document.getElementById('btn-novo-usuario').addEventListener('click', Usuarios.abrirNovo);
        await Usuarios.carregarLista();
    },

    async carregarLista() {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('id, nome, email, escopo, ativo, funcao_id, funcoes(nome)')
            .order('nome');

        const listaEl = document.getElementById('usu-lista');

        if (error) {
            listaEl.innerHTML = `<p class="vazio">Erro ao carregar usuários.</p>`;
            return;
        }

        Usuarios._cache = data || [];

        listaEl.innerHTML = `
            <div class="tabela-wrap">
                <table class="tabela">
                    <thead>
                        <tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Escopo</th><th>Ativo</th><th></th></tr>
                    </thead>
                    <tbody>
                        ${data.map(u => `
                            <tr>
                                <td>${App.escapeHTML(u.nome)}</td>
                                <td>${App.escapeHTML(u.email)}</td>
                                <td>${App.escapeHTML(u.funcoes?.nome || '—')}</td>
                                <td>${u.escopo === 'adm' ? 'ADM' : 'USER'}</td>
                                <td>${u.ativo ? '<span class="badge badge-concluido">Ativo</span>' : '<span class="badge badge-inativo">Inativo</span>'}</td>
                                <td><button class="btn btn-link" data-editar="${u.id}">Editar</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        listaEl.querySelectorAll('[data-editar]').forEach(btn => {
            btn.addEventListener('click', () => Usuarios.abrirFormulario(btn.dataset.editar));
        });
    },

    // ---------- CRIAR ----------
    abrirNovo() {
        Usuarios.editando = false;

        App.preencherSelect(document.getElementById('usu-funcao'), App.state.funcoes, 'Sem função definida');

        document.getElementById('modal-usuario-titulo').textContent = 'Novo usuário';
        document.getElementById('usu-grupo-id').hidden = true;
        document.getElementById('usu-grupo-senha').hidden = false;

        document.getElementById('usu-id').value = '';
        document.getElementById('usu-nome').value = '';
        document.getElementById('usu-email').value = '';
        document.getElementById('usu-senha').value = '';
        document.getElementById('usu-funcao').value = '';
        document.getElementById('usu-escopo').value = 'user';
        document.getElementById('usu-ativo').checked = true;

        const senha = document.getElementById('usu-senha');
        senha.required = true;

        App.abrirModal('modal-usuario');
    },

    // ---------- EDITAR ----------
    abrirFormulario(id) {
        const u = Usuarios._cache.find(x => x.id === id);
        if (!u) return;

        Usuarios.editando = true;

        App.preencherSelect(document.getElementById('usu-funcao'), App.state.funcoes, 'Sem função definida');

        document.getElementById('modal-usuario-titulo').textContent = 'Editar usuário';
        document.getElementById('usu-grupo-id').hidden = false;
        document.getElementById('usu-grupo-senha').hidden = true;

        document.getElementById('usu-id').value = u.id;
        document.getElementById('usu-nome').value = u.nome || '';
        document.getElementById('usu-email').value = u.email || '';
        document.getElementById('usu-funcao').value = u.funcao_id || '';
        document.getElementById('usu-escopo').value = u.escopo;
        document.getElementById('usu-ativo').checked = u.ativo;

        document.getElementById('usu-senha').required = false;

        App.abrirModal('modal-usuario');
    },

    // ---------- SALVAR (roteia) ----------
    async salvar(e) {
        e.preventDefault();
        if (Usuarios.editando) {
            return Usuarios.salvarEdicao();
        }
        return Usuarios.salvarNovo();
    },

    // ---------- SALVAR: edição (UPDATE direto, RLS cuida) ----------
    async salvarEdicao() {
        const id = document.getElementById('usu-id').value;
        const btn = document.getElementById('usu-salvar');
        btn.disabled = true;
        btn.textContent = 'Salvando...';

        const payload = {
            nome: document.getElementById('usu-nome').value.trim(),
            email: document.getElementById('usu-email').value.trim(),
            funcao_id: document.getElementById('usu-funcao').value || null,
            escopo: document.getElementById('usu-escopo').value,
            ativo: document.getElementById('usu-ativo').checked,
        };

        const { error } = await supabaseClient.from('usuarios').update(payload).eq('id', id);

        btn.disabled = false;
        btn.textContent = 'Salvar';

        if (error) {
            const msg = error.code === '23505'
                ? 'Já existe um usuário com esse e-mail.'
                : 'Erro ao salvar: ' + error.message;
            App.toast(msg, 'erro');
            return;
        }

        App.toast('Usuário atualizado.');
        App.fecharModal('modal-usuario');
        await Usuarios.carregarLista();

        if (id === App.state.perfil.id) {
            App.state.perfil.nome = payload.nome;
            App.state.perfil.email = payload.email;
            App.preencherCabecalho();
        }
    },

    // ---------- SALVAR: criação (Edge Function) ----------
    async salvarNovo() {
        const btn = document.getElementById('usu-salvar');
        btn.disabled = true;
        btn.textContent = 'Criando...';

        const payload = {
            nome: document.getElementById('usu-nome').value.trim(),
            email: document.getElementById('usu-email').value.trim(),
            senha: document.getElementById('usu-senha').value,
            funcao_id: document.getElementById('usu-funcao').value || null,
            escopo: document.getElementById('usu-escopo').value,
            ativo: document.getElementById('usu-ativo').checked,
        };

        const { data, error } = await supabaseClient.functions.invoke('criar-usuario', {
            body: payload,
        });

        btn.disabled = false;
        btn.textContent = 'Salvar';

        if (error) {
            // FunctionsHttpError traz o corpo em error.context
            let msg = error.message || 'Falha ao criar usuário.';
            try {
                if (error.context && typeof error.context.json === 'function') {
                    const corpo = await error.context.json();
                    if (corpo?.error) msg = corpo.error;
                }
            } catch (_) { /* ignora */ }
            App.toast(msg, 'erro');
            return;
        }

        if (data?.error) {
            App.toast(data.error, 'erro');
            return;
        }

        App.toast('Usuário criado com sucesso.');
        App.fecharModal('modal-usuario');
        await Usuarios.carregarLista();
    },
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('form-usuario').addEventListener('submit', Usuarios.salvar);
    document.getElementById('usu-cancelar').addEventListener('click', () => App.fecharModal('modal-usuario'));
});

App.registrarView('cadastro', { onEnter: Usuarios.render });
