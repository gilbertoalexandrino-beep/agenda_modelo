# Gestão de Visitas

Sistema web para gestão de visitas e agendamentos de equipes pedagógicas.
Painel único onde cada profissional registra suas visitas, o administrador
enxerga a rede inteira e a equipe enxerga o consolidado da semana.

Construído em **HTML/CSS/JavaScript puro** (sem framework), apoiado no
**Supabase** para autenticação, banco de dados e políticas de acesso
(RLS), com **FullCalendar** para visualização de calendário e **SheetJS**
para exportação em Excel.

---

## Sumário

- [Visão geral](#visão-geral)
- [Perfis de acesso](#perfis-de-acesso)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Modelo de dados](#modelo-de-dados)
- [Segurança](#segurança)
- [Instalação](#instalação)
- [Configuração do Supabase](#configuração-do-supabase)
- [Edge Function: `criar-usuario`](#edge-function-criar-usuario)
- [Como usar](#como-usar)
- [Personalização](#personalização)
- [Limitações conhecidas](#limitações-conhecidas)
- [Licença](#licença)

---

## Visão geral

O sistema foi desenhado para o dia a dia de uma equipe pedagógica que faz
visitas periódicas a escolas, unidades regionais (URE) e salas de
formação. Cada visita é um **agendamento** que relaciona:

- **Usuário** responsável (quem faz a visita)
- **Local** (escola, URE, etc.) e **cidade**
- **Data** e **período(s)** (manhã / tarde / noite)
- **Tarefa(s)** realizadas (acompanhamento, formação, ATPA, etc.)
- **Status** (planejado / concluído)
- **Objetivo** e **resumo** (texto livre)

O sistema oferece quatro formas de visualizar esses dados:

1. **Agenda** — lista com filtros, criação e edição
2. **Calendário** — visão de mês, semana ou lista (FullCalendar)
3. **Consolidado Semanal** — matriz local × dia da semana, mostrando
   onde cada profissional estará
4. **Relatórios** — individual (cada um vê o seu) e geral (ADM vê todos),
   com exportação em Excel

---

## Perfis de acesso

O sistema tem dois perfis, definidos na coluna `escopo` da tabela
`public.usuarios`:

### USER

- Consulta o próprio cadastro
- Consulta funções, locais e tarefas **ativos**
- Consulta seus próprios agendamentos (exceto no Consolidado, onde vê
  todos, para fins de coordenação de equipe)
- Cria agendamentos **somente para si**
- Edita e exclui **somente** seus próprios agendamentos
- Vê o próprio relatório e os indicadores

### ADM

- Consulta todos os usuários e agendamentos
- Altera dados complementares dos usuários (nome, e-mail, função,
  escopo, ativo)
- Cria, edita e exclui qualquer agendamento
- Gerencia funções, locais e tarefas
- Acessa o relatório geral (consolidado de toda a rede)
- Cria novos usuários via Edge Function (login + complemento)

---

## Funcionalidades

### 1. Início (Dashboard)

Cards de resumo + lista das próximas visitas.

- **USER:** total, planejadas, concluídas, próximas visitas pessoais
- **ADM:** total, planejadas, concluídas, usuários ativos, localidades

### 2. Agenda

Lista tabular dos agendamentos com filtros por data, local, período e
status. Cada linha abre o modal de edição (se o usuário tiver permissão).

### 3. Calendário

Integração com **FullCalendar 6**. Cores por status:

- 🟠 Planejado (laranja escuro)
- 🔵 Concluído (azul)

Clique em um evento para abrir detalhes (ou edição, se for seu).
Clique em um dia vazio para abrir o formulário de nova visita com a data
já preenchida. Em telas pequenas, inicia na visão de Lista.

### 4. Consolidado Semanal

Matriz com:

- **Linhas:** localidades
- **Colunas:** dias da semana
- **Células:** compromissos do local naquele dia, agrupados por período

Clique em qualquer célula vazia para criar uma visita com **data e local
já preenchidos**. Clique em um compromisso para ver os detalhes.

### 5. Cadastro (ADM)

Lista de usuários com edição de **nome**, **e-mail**, **função**,
**escopo** e **ativo**. Criação de novos usuários via **Edge Function**
`criar-usuario` (que usa `service_role` no servidor — nunca no
frontend).

### 6. Locais (ADM)

CRUD de localidades (nome + cidade). Localidades inativas deixam de
aparecer nos seletores de agendamento.

### 7. Tarefas (ADM)

CRUD dos tipos de tarefa (acompanhamento, formação, ATPA, etc.) com
descrição opcional.

### 8. Relatório (todos)

Relatório individual com filtros de data, local, tarefa e status,
cards de totais e exportação para **Excel** (SheetJS).

### 9. Relatório Geral (ADM)

Igual ao individual, mas com filtros adicionais (usuário, função,
cidade), ordenação por coluna e exportação.

### 10. Indicadores

Gráficos de barras simples (CSS puro) com distribuição por local,
tarefa, status, período e evolução semanal.

---

## Arquitetura

```
┌──────────────────────────────┐
│  Navegador (HTML/CSS/JS)     │
│  ─ SPA por troca de <section>│
│  ─ Supabase JS (client)      │
│  ─ FullCalendar / SheetJS    │
└───────────┬──────────────────┘
            │ HTTPS + JWT
            ▼
┌──────────────────────────────┐
│  Supabase                    │
│  ─ Auth (JWT)                │
│  ─ PostgreSQL + RLS          │
│  ─ Edge Function             │
│    criar-usuario             │
│    (service_role)            │
└──────────────────────────────┘
```

- **Frontend:** SPA com seções trocadas via JavaScript. Cada módulo
  registra sua view em `App.registrarView(id, { onEnter })`.
- **Autenticação:** Supabase Auth. O JWT do usuário é enviado em todas
  as requisições; a RLS do banco filtra as linhas por `auth.uid()`.
- **Edge Function:** roda no servidor Supabase com a `service_role`
  para criar usuários no Auth — operação que o cliente anon não pode
  fazer por segurança.
- **Sem framework:** tudo em JavaScript puro, sem build step, sem npm.
  Basta abrir o `index.html` (com um servidor HTTP simples) e funciona.

---

## Estrutura de arquivos

```
.
├── index.html                    # Shell da aplicação (login, app, modais)
├── LICENSE                       # Licença MIT
├── README.md
├── css/
│   └── style.css                 # Todo o CSS (variáveis, componentes, responsivo)
├── js/
│   ├── supabase.js               # URL + chave anon + instancia do client
│   ├── app.js                    # Núcleo: estado, navegação, utilitários
│   ├── auth.js                   # Login, logout, erros
│   ├── dashboard.js              # Tela Início
│   ├── agenda.js                 # Tela Agenda + formulário de agendamento
│   ├── calendario.js             # Tela Calendário (FullCalendar)
│   ├── consolidado.js            # Tela Consolidado Semanal
│   ├── usuarios.js               # Tela Cadastro (ADM)
│   ├── locais.js                 # Tela Locais (ADM)
│   ├── tarefas.js                # Tela Tarefas (ADM)
│   ├── relatorios.js             # Relatório + Relatório Geral
│   └── indicadores.js            # Tela Indicadores
└── image/
    ├── logo.png
    ├── casa.png
    ├── caderno-alternativo.png
    ├── relogio-calendario.png
    ├── semana-do-calendario.png
    ├── pin.png
    ├── tarefas.png
    ├── adicionar-usuario.png
    ├── relatorio-de-dados.png
    ├── arquivo-excel.png
    └── calculadora.png
```

**Fora do repositório**, no painel Supabase:

```
supabase/functions/criar-usuario/index.ts   # Edge Function (deploy separado)
```

---

## Modelo de dados

Cinco tabelas no schema `public`:

### `funcoes`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | bigint PK | |
| `nome` | text NOT NULL UNIQUE | Supervisor, CEC, PEC, Dirigente… |
| `ativo` | boolean | default `true` |

### `usuarios`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK FK → `auth.users.id` | |
| `nome` | text NOT NULL | |
| `email` | text NOT NULL UNIQUE | |
| `escopo` | text NOT NULL | `'adm'` ou `'user'` |
| `funcao_id` | bigint FK → `funcoes.id` | opcional |
| `ativo` | boolean | default `true` |
| `created_at` | timestamptz | default `now()` |

### `locais`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | bigint PK | |
| `nome` | text NOT NULL | |
| `cidade` | text NOT NULL | |
| `ativo` | boolean | default `true` |
| | | UNIQUE (`nome`, `cidade`) |

### `tarefas`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | bigint PK | |
| `nome` | text NOT NULL UNIQUE | |
| `descricao` | text | opcional |
| `ativo` | boolean | default `true` |

### `agendamentos`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | bigint PK | |
| `usuario_id` | uuid NOT NULL FK → `usuarios.id` | |
| `local_id` | bigint NOT NULL FK → `locais.id` | |
| `tarefa_id` | bigint NOT NULL FK → `tarefas.id` | |
| `data` | date NOT NULL | |
| `periodo` | text NOT NULL | `'manha'`, `'tarde'`, `'noite'` |
| `status` | text NOT NULL | `'planejado'` ou `'concluido'` |
| `objetivo` | text | opcional |
| `resumo` | text | **obrigatório** se `status = 'concluido'` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | atualizado por trigger |

**Restrições importantes:**

- `status = 'concluido'` exige `resumo` não-vazio
- `periodo` restrito a `'manha'`, `'tarde'`, `'noite'`
- `status` restrito a `'planejado'`, `'concluido'`

---

## Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS **habilitada e forçada**
(`force row level security`), o que significa que nem o dono da tabela
escapa das policies — só `service_role` (usado apenas na Edge Function).

Resumo das policies:

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `funcoes` | ADM ou ativo | ADM | ADM | ADM |
| `locais` | ADM ou ativo | ADM | ADM | ADM |
| `tarefas` | ADM ou ativo | ADM | ADM | ADM |
| `usuarios` | self ou ADM | ADM | self (nome/e-mail) ou ADM | — |
| `agendamentos` | ativo (todos veem) | self ou ADM | self ou ADM | self ou ADM |

### Trigger de proteção de campos administrativos

Na tabela `usuarios`, uma trigger (`trg_usuarios_protege_campos_admin`)
impede que um USER altere `escopo`, `funcao_id` ou `ativo` do próprio
registro — mesmo que a RLS permita o UPDATE. Isso é necessário porque
RLS é row-level, não column-level.

### Edge Function com `service_role`

A `service_role` do Supabase **nunca** vai para o frontend. Ela só é
usada dentro da Edge Function `criar-usuario`, que roda no servidor,
valida o JWT do chamador, confirma que é ADM ativo e só então cria o
usuário no Auth.

### Boas práticas seguidas

- Nenhuma credencial privilegiada no código do cliente
- RLS em todas as tabelas, sem exceção
- Funções `SECURITY DEFINER` com `search_path = ''` (evita ataque por
  sequestro de schema)
- Validação de payload na Edge Function (nunca confiar no cliente)

---

## Instalação

### Pré-requisitos

- Conta no [Supabase](https://supabase.com) (free tier resolve)
- Um servidor HTTP simples para servir os arquivos (não abrir via
  `file://` — o CORS do Supabase bloqueia)

### Opção A — VSCode + Live Server

1. Abra a pasta do projeto no VSCode
2. Instale a extensão **Live Server**
3. Clique em **Go Live** no canto inferior direito

### Opção B — Python

```bash
cd pasta-do-projeto
python -m http.server 8000
```

Acesse `http://localhost:8000`.

### Opção C — Node

```bash
npx serve .
```

### Opção D — Hospedagem estática

Netlify, Vercel, GitHub Pages, Cloudflare Pages — qualquer uma funciona
(é só HTML/CSS/JS estático). Lembre de configurar o Supabase como
origem permitida em **Authentication → URL Configuration**.

---

## Configuração do Supabase

### 1. Criar o projeto

No painel Supabase, crie um projeto novo. Anote a **URL** e a
**anon key** (Settings → API).

### 2. Rodar o schema

Cole o script SQL completo no **SQL Editor** e execute. Isso cria:

- Tabelas (`funcoes`, `usuarios`, `locais`, `tarefas`, `agendamentos`)
- Índices
- Triggers (`updated_at`, proteção de campos, auto-criação de usuário)
- Funções auxiliares (`usuario_e_adm`, `usuario_esta_ativo`,
  `listar_usuarios_ativos`)
- RLS + policies
- Dados iniciais (funções, tarefas, locais de exemplo)

### 3. Configurar `js/supabase.js`

As credenciais ficam no topo do arquivo `js/supabase.js`:

```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';   // chave anon completa

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
        },
    }
);
```

> A chave anon é **pública por design**. Quem protege os dados é a RLS.

### 4. Criar o primeiro ADM

Em **Authentication → Users**, crie um usuário com e-mail e senha.
O trigger `trg_on_auth_user_created` vai inserir automaticamente uma
linha em `public.usuarios` com `escopo = 'user'`.

Promova-o a ADM rodando no SQL Editor:

```sql
update public.usuarios
   set escopo = 'adm',
       nome   = 'Seu Nome Completo'
 where email = 'seu@email.com';
```

Depois faça login no app com esse usuário.

---

## Edge Function: `criar-usuario`

### Por que existe

Criar usuários no Supabase Auth exige `service_role`, que **nunca**
pode ficar no frontend. A Edge Function roda no servidor com essa
credencial e expõe apenas um endpoint autenticado.

### Deploy

No painel Supabase:

1. Menu lateral → **Edge Functions**
2. **Deploy a new function** → nome: `criar-usuario`
3. Cole o código TypeScript
4. **Deploy**
5. Confirme que **Enforce JWT verification** está **ativado** em
   Settings

### Variáveis de ambiente

São injetadas automaticamente pelo Supabase — não precisa configurar:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Como o frontend chama

```javascript
const { data, error } = await supabaseClient.functions.invoke('criar-usuario', {
    body: { nome, email, senha, funcao_id, escopo, ativo }
});
```

O `supabase-js` envia o JWT do usuário logado automaticamente. A função
valida que é ADM ativo antes de criar.

---

## Como usar

### Login

Acesse a URL, insira e-mail e senha cadastrados.

### Criar uma visita

**Pela Agenda:**

1. **+ Nova visita**
2. Preencha local, data, período(s), tarefa(s), objetivo, status
3. **Salvar**

**Pelo Calendário:**

- Clique em um dia vazio → abre o formulário com a data preenchida

**Pelo Consolidado:**

- Clique em uma célula vazia → abre o formulário com data e local
  preenchidos

### Marcar como concluída

Edite a visita, mude o status para **Concluído** e preencha o
**resumo** (obrigatório).

### Exportar para Excel

No **Relatório** ou **Relatório Geral**, clique em **⬇ Exportar
Excel**. O arquivo é gerado localmente pelo SheetJS (nada é enviado
para servidor).

### Gerenciar usuários (ADM)

**Cadastro → + Novo usuário** → preencha tudo → Salvar. O usuário é
criado no Auth + complemento em `public.usuarios` numa transação.

---

## Personalização

### Cores

Edite as variáveis CSS no topo de `css/style.css`:

```css
:root {
    --cor-primaria: #1F3A5F;
    --cor-primaria-escura: #16293F;
    --cor-planejado: #B5540A;
    --cor-concluido: #1D5FA6;
    /* ... */
}
```

### Períodos

Hoje são três: `manha`, `tarde`, `noite`. Para adicionar um quarto:

1. Adicione o label em `App.periodoLabel`
2. Adicione a opção no modal (`index.html`)
3. Atualize a constraint SQL `agendamentos_periodo_check`

### Ícones

Trocados de emoji para PNG em `image/`. Para substituir, basta
sobrescrever o arquivo com o mesmo nome ou editar o array de itens do
menu em `app.js` (`montarMenu`).

---

## Limitações conhecidas

- **Sem confirmação de e-mail** — a Edge Function cria usuários com
  `email_confirm: true` para simplificar o fluxo interno
- **Uma tarefa por agendamento** — o modelo atual permite apenas uma
  tarefa por visita
- **Recuperação de senha** — não implementada no frontend (o Supabase
  oferece, mas a UI não tem link "esqueci minha senha")
- **Sem PWA / offline** — requer conexão
- **Sem notificações** — não há e-mail nem push ao criar/alterar
  agendamento
- **Sem log de auditoria** — não há histórico de quem alterou o quê

---

## Licença

Distribuído sob a **Licença MIT**. Veja o arquivo [LICENSE](LICENSE)
para o texto completo.

Em resumo: você pode usar, copiar, modificar, mesclar, publicar,
distribuir, sublicenciar e/ou vender cópias do software, desde que
mantenha o aviso de copyright e a licença original em todas as cópias
ou partes substanciais do software. O software é fornecido "como está",
sem garantias de qualquer tipo.

As bibliotecas de terceiros usadas via CDN (FullCalendar, SheetJS,
Supabase JS) mantêm suas próprias licenças originais.

---

## Suporte

Dúvidas, sugestões ou bugs: abrir uma issue no repositório ou
contatar o administrador do sistema.
