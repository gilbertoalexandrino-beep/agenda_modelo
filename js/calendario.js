/* ============================================================
   calendario.js
   Tela "Calendário": visão em FullCalendar dos agendamentos.
   USER vê só os próprios; ADM vê todos.
   Períodos múltiplos → um evento por período.
   ============================================================ */

const Calendario = {
    instancia: null,

    async render() {
        const container = document.getElementById('view-calendario');
        const isAdm = App.state.isAdm;
        const isMobile = window.matchMedia('(max-width: 640px)').matches;

        container.innerHTML = `
            <div class="view-cabecalho">
                <h1>Calendário</h1>
                <p class="subtitulo">${isAdm ? 'Visitas agendadas da equipe.' : 'Suas visitas agendadas.'}</p>
            </div>
            <div class="legenda">
                <span class="legenda-item"><span class="ponto ponto-planejado"></span> Planejado</span>
                <span class="legenda-item"><span class="ponto ponto-concluido"></span> Concluído</span>
            </div>
            <div id="calendario-el" class="painel"></div>
        `;

        const eventos = await Calendario.buscarEventos();

        const el = document.getElementById('calendario-el');
        if (Calendario.instancia) Calendario.instancia.destroy();

        // Config responsiva: mobile começa em "Lista" e tem menos botões
        const headerToolbar = isMobile
            ? { left: 'prev,next', center: 'title', right: 'today' }
            : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' };

        Calendario.instancia = new FullCalendar.Calendar(el, {
            locale: 'pt-br',
            height: 'auto',
            initialView: isMobile ? 'listWeek' : 'dayGridMonth',
            headerToolbar,
            buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Lista' },
            // Em telas pequenas, esconde o "+N mais" e deixa o usuário tocar no dia
            dayMaxEvents: isMobile ? 3 : false,
            events: eventos,
            eventClick: (info) => Calendario.aoClicarEvento(info.event.extendedProps.agendamentoId),
            dateClick:  (info) => Calendario.aoClicarDia(info.dateStr),

            eventContent: (arg) => {
                const p = arg.event.extendedProps;
                const nomeBloco = App.state.isAdm
                    ? `<span class="evento-cal-usuario">${App.escapeHTML(p.usuario)}</span>`
                    : '';

                return {
                    html: `
                        <div class="evento-cal-wrap">
                            <div class="evento-cal-periodo">${App.periodoLabel[p.periodo]}</div>
                            <div class="evento-cal-caixa">
                                <div class="evento-cal-local">${App.escapeHTML(p.local)}</div>
                                <div class="evento-cal-tarefa">${nomeBloco}${App.escapeHTML(p.tarefa)}</div>
                            </div>
                        </div>
                    `
                };
            },
        });

        Calendario.instancia.render();

        // Re-renderiza se a tela girar ou redimensionar entre mobile/desktop
        if (!Calendario._resizeBound) {
            Calendario._resizeBound = true;
            let t = null;
            window.addEventListener('resize', () => {
                clearTimeout(t);
                t = setTimeout(() => {
                    const calView = document.getElementById('view-calendario');
                    if (calView && !calView.hidden) Calendario.render();
                }, 250);
            });
        }
    },

    async carregarNomes() {
        const { data, error } = await supabaseClient.rpc('listar_usuarios_ativos');
        const mapa = {};
        if (!error && data) {
            data.forEach(u => { mapa[u.id] = u.nome; });
        }
        Calendario.nomesCompletos = mapa;
        Calendario.nomesExibicao = Calendario.montarMapaExibicao(mapa);
        return mapa;
    },

    montarMapaExibicao(mapaCompleto) {
        const contagem = {};
        Object.values(mapaCompleto).forEach(nomeCompleto => {
            const primeiro = (nomeCompleto || '').trim().split(/\s+/)[0] || '—';
            contagem[primeiro] = (contagem[primeiro] || 0) + 1;
        });

        const exibicao = {};
        Object.entries(mapaCompleto).forEach(([id, nomeCompleto]) => {
            const partes = (nomeCompleto || '').trim().split(/\s+/);
            const primeiro = partes[0] || '—';

            if (contagem[primeiro] > 1 && partes.length > 1) {
                exibicao[id] = `${primeiro} ${partes[1]}`;
            } else {
                exibicao[id] = primeiro;
            }
        });
        return exibicao;
    },

    async buscarEventos() {
        let query = supabaseClient
            .from('agendamentos')
            .select('id, data, periodo, status, objetivo, resumo, local_id, tarefa_id, usuario_id, locais(nome, cidade), tarefas(nome)');

        if (!App.state.isAdm) query = query.eq('usuario_id', App.state.perfil.id);

        const { data, error } = await query;
        if (error || !data) return [];

        await Calendario.carregarNomes();
        const nomes = Calendario.nomesCompletos;
        const nomesExibicao = Calendario.nomesExibicao;

        Calendario._cache = {};
        data.forEach(a => {
            a.usuarios = { nome: nomes[a.usuario_id] || '—' };
            Calendario._cache[a.id] = a;
        });

        // Um evento por período (agendamento pode ter 1, 2 ou 3)
        const eventos = [];
        data.forEach(a => {
            const periodos = Array.isArray(a.periodo) ? a.periodo : [a.periodo];
            periodos.forEach(per => {
                eventos.push({
                    id: `${a.id}__${per}`,
                    title: '',
                    start: a.data,
                    allDay: true,
                    classNames: [`evento-cal-${a.status}`],
                    extendedProps: {
                        agendamentoId: a.id,
                        periodo: per,
                        local: a.locais?.nome || '—',
                        tarefa: a.tarefas?.nome || '—',
                        usuario: nomesExibicao[a.usuario_id] || '—',
                        status: a.status,
                    },
                });
            });
        });

        return eventos;
    },

    aoClicarEvento(id) {
        const a = Calendario._cache[id];
        if (!a) return;

        const podeEditar = App.state.isAdm || a.usuario_id === App.state.perfil.id;

        if (a.status === 'planejado' && podeEditar) {
            Agenda.bindFormulario();
            Agenda.abrirFormulario(a);
        } else {
            Calendario.abrirDetalhes(id);
        }
    },

    aoClicarDia(dataISO) {
        Agenda.bindFormulario();
        Agenda.novaVisitaComData(dataISO);
    },

    abrirDetalhes(id) {
        const a = Calendario._cache[id];
        if (!a) return;

        document.getElementById('detalhes-conteudo').innerHTML = Calendario.montarDetalhes(a);
        App.abrirModal('modal-detalhes');
    },

    montarDetalhes(a) {
        return `
            <dl class="detalhes-lista">
                ${App.state.isAdm ? `<dt>Usuário</dt><dd>${App.escapeHTML(a.usuarios?.nome || '—')}</dd>` : ''}
                <dt>Local</dt><dd>${App.escapeHTML(a.locais?.nome || '—')}</dd>
                <dt>Cidade</dt><dd>${App.escapeHTML(a.locais?.cidade || '—')}</dd>
                <dt>Data</dt><dd>${App.formatarData(a.data)}</dd>
                <dt>Período</dt><dd>${App.rotuloPeriodos(a.periodo)}</dd>
                <dt>Tarefa</dt><dd>${App.escapeHTML(a.tarefas?.nome || '—')}</dd>
                <dt>Objetivo</dt><dd>${App.escapeHTML(a.objetivo || '—')}</dd>
                <dt>Status</dt><dd>${App.badgeStatus(a.status)}</dd>
                <dt>Resumo</dt><dd>${App.escapeHTML(a.resumo || '—')}</dd>
            </dl>
        `;
    },
};

App.registrarView('calendario', { onEnter: Calendario.render });
