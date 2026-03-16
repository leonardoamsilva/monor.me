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
VITE_FII_API_TOKEN=
VITE_FII_API_TOKEN_HEADER=Authorization
VITE_FII_API_TOKEN_PREFIX=Bearer
VITE_FII_API_PROXY_TARGET=http://127.0.0.1:8000
```

Notas:
- `VITE_FII_API_BASE_URL`: deixe vazio no dev para usar o proxy do Vite (evita CORS). Em producao, use a URL da API na Vercel (ex.: `https://sua-api.vercel.app`).
- `VITE_FII_API_DETAILS_PATH`: rota usada pelo front.
- `VITE_FII_API_DIVIDENDS_PATH`: rota usada para consultar proventos por mes (o front converte `YYYY-MM` para nome do mes, ex.: `marco`).
- `VITE_FII_API_TOKEN`: token exigido pela API.
- `VITE_FII_API_TOKEN_HEADER`: nome do header de autenticacao (padrao `Authorization`).
- `VITE_FII_API_TOKEN_PREFIX`: prefixo do token (padrao `Bearer`; deixe vazio para enviar token puro).
- `VITE_FII_API_PROXY_TARGET`: host real da sua API local.
- Exemplo detalhes (dev): `/api/fii/HGLG11` (proxy para `http://127.0.0.1:8000/fii/HGLG11`).
- Exemplo proventos (dev): `/api/dividendos/marco` (proxy para `http://127.0.0.1:8000/dividendos/marco`).

## 🔐 Login (Supabase)

Para autenticar usuarios na rota `/login`, configure no `.env`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Notas:
- `VITE_SUPABASE_URL`: URL do seu projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: chave anon publica do Supabase.
- Sem essas variaveis, o botao de login fica desabilitado e a tela mostra aviso de configuracao.
- As rotas `/app/*` estao protegidas e redirecionam para `/login` quando nao ha sessao valida.
- Estrategia atual: login inicial apenas com Google (sem cadastro por email/senha na UI).

### Google Login (Supabase OAuth)

Para usar `continuar com Google` na rota `/login`:

1. No Supabase, habilite o provider Google em `Auth > Providers`.
2. Configure `Client ID` e `Client Secret` do Google OAuth.
3. Em `Auth > URL Configuration`, adicione o redirect:
	- `http://localhost:5173/app` (desenvolvimento)
	- URL de producao equivalente, ex.: `https://seu-dominio.com/app`
4. No Google Cloud Console, adicione como Authorized redirect URI o callback do Supabase:
	- `https://<project-ref>.supabase.co/auth/v1/callback`

O frontend ja inicia o OAuth com `redirectTo = <origem>/app`.

## 🛣️ Proximos Passos (usuarios e planos)

- Plano de execucao: `docs/PLANO_USUARIOS_E_PLANOS.md`