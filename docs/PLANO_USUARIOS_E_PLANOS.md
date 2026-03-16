# Plano de execucao: Usuarios e Planos

Data de inicio: 2026-03-15

## Objetivo
Evoluir o app para:
1. suportar usuarios autenticados com dados sincronizados;
2. preparar controle de recursos por plano;
3. habilitar cobranca no momento certo, sem retrabalho estrutural.

## Estado atual (resumo)
- Frontend React com Vite.
- Persistencia principal em localStorage.
- Consumo de API com token no frontend.
- Sem autenticacao, assinatura, entitlements ou backend de produto.

## Decisoes de arquitetura
- Regras de acesso por plano ficam no backend (fonte da verdade).
- Frontend apenas renderiza com base em entitlements retornados pela API.
- Separar claramente:
  - identidade (auth)
  - assinatura (billing)
  - autorizacao por recurso (entitlements)

## Fase 1: Receber usuarios (prioridade maxima)

### Entrega 1.1 - Base de identidade
- [ ] Escolher provedor de auth (Supabase Auth, Clerk, Auth0 ou proprio).
- [ ] Implementar login, cadastro, logout e reset de senha.
- [ ] Garantir confirmacao de email.
- [ ] Criar `AuthContext` no frontend para sessao atual.

### Entrega 1.2 - Persistencia em nuvem
- [ ] Criar backend de produto (API) para carteira e configuracoes.
- [ ] Definir banco PostgreSQL e migracoes iniciais.
- [ ] Criar tabelas minimas:
  - `profiles` (referenciando `auth.users`)
  - `portfolios`
  - `portfolio_positions`
  - `user_settings`
  - `audit_events`
- [ ] Migrar leitura/escrita do frontend para API autenticada.

### Entrega 1.3 - Migracao do local para conta
- [ ] Ao primeiro login, detectar dados locais existentes.
- [ ] Exibir CTA para importar carteira/configuracoes.
- [ ] Executar importacao idempotente (nao duplicar posicoes).
- [ ] Marcar migracao concluida por usuario.

### Entrega 1.4 - Operacao minima
- [ ] Adicionar error tracking (Sentry ou equivalente).
- [ ] Adicionar logs estruturados no backend.
- [ ] Definir alertas basicos (5xx, latencia, falhas de login).

## Fase 2: Preparar planos (sem cobrar ainda)

### Entrega 2.1 - Modelo de planos
- [ ] Criar tabelas:
  - `plans`
  - `subscriptions`
  - `entitlements`
  - `subscription_events`
- [ ] Definir status de assinatura: `trialing`, `active`, `past_due`, `canceled`.

### Entrega 2.2 - Feature gating
- [ ] Criar middleware backend `requireEntitlement(featureKey)`.
- [ ] Criar endpoint `GET /me/entitlements`.
- [ ] No frontend, esconder/mostrar UI por entitlement.
- [ ] Bloquear no backend o acesso real ao recurso premium.

### Entrega 2.3 - Metricas de produto
- [ ] Instrumentar eventos principais:
  - onboarding completo
  - carteira criada
  - uso de simulador
  - uso de recurso premium
- [ ] Criar painel simples de ativacao e retencao.

## Fase 3: Cobranca

### Entrega 3.1 - Integracao de pagamento
- [ ] Escolher gateway aderente ao Brasil.
- [ ] Criar checkout e portal de assinatura.
- [ ] Implementar webhooks idempotentes.

### Entrega 3.2 - Ciclo de vida de assinatura
- [ ] Trial, upgrade, downgrade, cancelamento e reativacao.
- [ ] Dunning para falha de pagamento.
- [ ] Historico de faturamento no app.

### Entrega 3.3 - Compliance e suporte
- [ ] Termos de uso e politica de privacidade/LGPD.
- [ ] Fluxo de suporte para cobranca.
- [ ] Politica de reembolso.

## Backlog tecnico imediato (proxima sprint)
1. Definir stack de backend + auth.
2. Criar schema SQL inicial e migracoes (base proposta em `docs/schema_inicial.sql`).
3. Criar endpoints autenticados para carteira e settings.
4. Implementar `AuthContext` no frontend.
5. Trocar hooks do app para usar API autenticada.
6. Implementar fluxo de importacao do localStorage no primeiro login.

## Criterios de pronto para abrir cadastro
- Login/cadastro funcionando com email confirmado.
- Dados persistidos em nuvem por usuario.
- Nao existir segredo no bundle frontend.
- Monitoramento basico ativo.
- Rollback simples para incidentes.

## Criterios de pronto para abrir plano pago
- Entitlements em producao (backend e frontend).
- Checkout + webhooks com testes de ponta a ponta.
- Politicas legais publicadas.
- Painel de eventos para acompanhar conversao e churn.
