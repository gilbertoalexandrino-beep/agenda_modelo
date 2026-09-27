/* ============================================================
   usuarios.js
   Tela "Cadastro" (somente ADM): edita os dados complementares
   da tabela public.usuarios (nome, email, função, escopo, ativo).
   NÃO cria usuários do Supabase Auth — eles devem ser criados
   previamente em Authentication > Users.
   ============================================================ */

const Usuarios = {
    async render() {
        const container = document.getElementById('view-cadastro');
        container.innerHTML = `
            <div class="view-cabecalho">
                <h1>Cadastro de usuários</h1>
                <p class="subtitulo">Edite nome, e-mail, função, escopo e status dos usuários já existentes no Supabase Auth.</p>
            </div>
            <div id="usu-lista"><div class="carregando">Carregando usuários...</div></div>
        `;
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

    abrirFormulario(id) {
        const u = Usuarios._cache.find(x => x.id === id);
        if (!u) return;

        App.preencherSelect(document.getElementById('usu-funcao'), App.state.funcoes, 'Sem função definida');

        document.getElementById('usu-id').value = u.id;
        document.getElementById('usu-nome').value = u.nome || '';
        document.getElementById('usu-email').value = u.email || '';
        document.getElementById('usu-funcao').value = u.funcao_id || '';
        document.getElementById('usu-escopo').value = u.escopo;
        document.getElementById('usu-ativo').checked = u.ativo;

        App.abrirModal('modal-usuario');
    },

    async salvar(e) {
        e.preventDefault();
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
            // 23505 = unique violation (email já cadastrado em outro usuário)
            const msg = error.code === '23505'
                ? 'Já existe um usuário com esse e-mail.'
                : 'Erro ao salvar: ' + error.message;
            App.toast(msg, 'erro');
            return;
        }

        App.toast('Usuário atualizado com sucesso.');
        App.fecharModal('modal-usuario');
        await Usuarios.carregarLista();

        // Se o ADM editou o próprio registro, atualiza o cabeçalho na hora
        if (id === App.state.perfil.id) {
            App.state.perfil.nome = payload.nome;
            App.state.perfil.email = payload.email;
            App.preencherCabecalho();
        }
    },
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('form-usuario').addEventListener('submit', Usuarios.salvar);
    document.getElementById('usu-cancelar').addEventListener('click', () => App.fecharModal('modal-usuario'));
});

App.registrarView('cadastro', { onEnter: Usuarios.render });