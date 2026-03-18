# monor.me

Fintech pessoal para gerenciamento de investimentos em Fundos Imobiliários (FIIs).

## ✨ Features

- 📊 **Dashboard** — Visão geral com métricas de investimentos
- 💼 **Carteira** — Gerenciamento completo de FIIs (CRUD)
- 🧮 **Cálculo automático** — Renda mensal baseada no Dividend Yield
- ⌨️ **Command Palette** — Navegação rápida com `Ctrl+K`
- 💾 **Persistência local** — Dados salvos no navegador
- 🌙 **Dark mode** — Interface premium e elegante

## 🚀 Tech Stack

- **React 19** — Biblioteca UI
- **Vite 7** — Build tool ultrarrápido
- **Tailwind CSS 4** — Estilização utility-first
- **React Router** — Navegação SPA
- **LocalStorage** — Persistência de dados

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/leonardoamsilva/monor.me.git

# Entre na pasta
cd monor.me

# Instale as dependências
npm install

# Configure o ambiente local (opcional)
# Windows (PowerShell):
# copy .env.example .env

# Rode o projeto
npm run dev

```

## 🔌 API local (substituindo BRAPI)

O autocomplete agora usa uma lista local de tickers da B3 (`src/data/fiiTickers.js`) e **não faz chamada de rede**.

Para buscar os dados do FII selecionado, configure sua API local via `.env`:

```bash
VITE_FII_API_BASE_URL=
VITE_FII_API_DETAILS_PATH=/api/fii/:ticker
VITE_FII_API_DIVIDENDS_PATH=/api/dividendos/:month

FII_API_PROXY_TARGET=http://127.0.0.1:8000
FII_API_UPSTREAM_BASE_URL=
FII_API_UPSTREAM_DETAILS_PATH=/fii/:ticker
FII_API_UPSTREAM_DIVIDENDS_PATH=/dividendos/:month
FII_API_TOKEN=
FII_API_TOKEN_HEADER=Authorization
FII_API_TOKEN_PREFIX=Bearer
FII_API_TIMEOUT_MS=10000
FII_API_ALLOWED_ORIGINS=
FII_API_RATE_LIMIT_WINDOW_MS=60000
FII_API_RATE_LIMIT_MAX_REQUESTS=120
```

Notas:
- `VITE_FII_API_BASE_URL`: base publica usada pelo frontend. Deixe vazio para usar o mesmo dominio do app (`/api/...`).
- `VITE_FII_API_DETAILS_PATH`: rota usada pelo front.
- `VITE_FII_API_DIVIDENDS_PATH`: rota usada para consultar proventos por mes (o front converte `YYYY-MM` para nome do mes, ex.: `marco`).
- `FII_API_PROXY_TARGET`: host real da API no `npm run dev` (proxy do Vite, server-side).
- `FII_API_UPSTREAM_BASE_URL`: base da API real consumida pelo backend/proxy em producao.
- `FII_API_UPSTREAM_DETAILS_PATH`: caminho de detalhes no upstream.
- `FII_API_UPSTREAM_DIVIDENDS_PATH`: caminho de dividendos no upstream.
- `FII_API_TOKEN`: segredo da API (somente servidor; nunca usar `VITE_`).
- `FII_API_TOKEN_HEADER`: header da autenticacao server-side.
- `FII_API_TOKEN_PREFIX`: prefixo do token server-side.
- `FII_API_TIMEOUT_MS`: timeout da chamada upstream em ms.
- `FII_API_ALLOWED_ORIGINS`: lista de origens permitidas para CORS separada por virgula (ex.: `https://monor.me,https://www.monor.me`).
- `FII_API_RATE_LIMIT_WINDOW_MS`: janela do rate limit em ms.
- `FII_API_RATE_LIMIT_MAX_REQUESTS`: maximo de requests por IP e rota dentro da janela.
- Exemplo detalhes (dev): `/api/fii/HGLG11` (proxy para `http://127.0.0.1:8000/fii/HGLG11`).
- Exemplo proventos (dev): `/api/dividendos/marco` (proxy para `http://127.0.0.1:8000/dividendos/marco`).

Seguranca:
- O frontend nao envia mais token de API.
- A autenticacao da API de mercado fica apenas no servidor (`api/` e proxy do Vite em dev).
- O backend aplica allowlist de origem (`FII_API_ALLOWED_ORIGINS`) e rate limit por IP/rota.
- Qualquer token previamente usado como `VITE_FII_API_TOKEN` deve ser rotacionado imediatamente.

Persistencia de confirmacao manual de proventos:
- As confirmacoes de "comprei antes da data-com" agora sao salvas no Supabase por usuario.
- Para habilitar, aplique no SQL Editor o schema atualizado em `docs/schema_inicial.sql` (tabela `dividend_eligibility_overrides` + RLS).

Checklist de deploy seguro (Vercel):
1. Rotacione o token antigo no provedor da API de mercado.
2. Em `Project Settings > Environment Variables`, configure apenas no servidor:
	- `FII_API_UPSTREAM_BASE_URL`
	- `FII_API_UPSTREAM_DETAILS_PATH`
	- `FII_API_UPSTREAM_DIVIDENDS_PATH`
	- `FII_API_TOKEN`
	- `FII_API_TOKEN_HEADER`
	- `FII_API_TOKEN_PREFIX`
	- `FII_API_TIMEOUT_MS`
	- `FII_API_ALLOWED_ORIGINS`
	- `FII_API_RATE_LIMIT_WINDOW_MS`
	- `FII_API_RATE_LIMIT_MAX_REQUESTS`
3. Nao configure `FII_API_TOKEN` como `VITE_*`.
4. Faça deploy e valide os endpoints:
	- `GET /api/fii/HGLG11`
	- `GET /api/dividendos/marco`

## 🔐 Login (Supabase)

Para autenticar usuarios na rota `/login`, configure no `.env`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_REDIRECT_TO=
```

Notas:
- `VITE_SUPABASE_URL`: URL do seu projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: chave anon publica do Supabase.
- `VITE_SUPABASE_REDIRECT_TO`: opcional. Define o redirect exato do OAuth (ex.: `http://192.168.0.10:5173/app` para teste no celular).
- Sem essas variaveis, o botao de login fica desabilitado e a tela mostra aviso de configuracao.
- As rotas `/app/*` estao protegidas e redirecionam para `/login` quando nao ha sessao valida.
- Estrategia atual: login inicial apenas com Google (sem cadastro por email/senha na UI).

### Google Login (Supabase OAuth)

Para usar `continuar com Google` na rota `/login`:

1. No Supabase, habilite o provider Google em `Auth > Providers`.
2. Configure `Client ID` e `Client Secret` do Google OAuth.
3. Em `Auth > URL Configuration`, adicione o redirect:
	- `http://localhost:5173/app` (desenvolvimento)
	- `http://<IP-DA-SUA-MAQUINA>:5173/app` (teste pelo celular na rede local)
	- URL de producao equivalente, ex.: `https://seu-dominio.com/app`
4. No Google Cloud Console, adicione como Authorized redirect URI o callback do Supabase:
	- `https://<project-ref>.supabase.co/auth/v1/callback`

O frontend ja inicia o OAuth com `redirectTo = <origem>/app`.
Com `VITE_SUPABASE_REDIRECT_TO`, voce pode forcar outro host de callback (ex.: IP local) para evitar erro de conexao recusada no celular.

## 🛣️ Proximos Passos (usuarios e planos)

- Plano de execucao: `docs/PLANO_USUARIOS_E_PLANOS.md`