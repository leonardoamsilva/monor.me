import { useState } from 'react';
import {
  isSupabaseConfigured,
  signInWithGoogle,
} from '../services/auth';

function Login() {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleGoogleSignIn() {
    setErrorMessage('');
    setSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao iniciar Google login.');
      setSubmitting(false);
    }
  }

  return (
    <div className="landing-shell page-open-fade relative min-h-screen overflow-hidden bg-bg text-text">
      <div className="pointer-events-none absolute left-[-120px] top-[-80px] h-72 w-72 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[-100px] bottom-[-80px] h-72 w-72 rounded-full bg-success/15 blur-3xl" aria-hidden="true" />

      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="reveal-up rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">acesso seguro</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Entre em 1 clique com Google</h1>
            <p className="mt-3 max-w-lg text-sm text-muted sm:text-base">
              Sem senha para lembrar, sem etapa extra de cadastro inicial. A conta nasce automaticamente no primeiro login.
            </p>

            {!isSupabaseConfigured && (
              <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                Supabase nao configurado no ambiente. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env`.
              </p>
            )}

            <div className="mt-8 space-y-4">
              <button
                type="button"
                disabled={submitting || !isSupabaseConfigured}
                onClick={handleGoogleSignIn}
                className="w-full rounded-xl border border-[#d6d8de] bg-white px-4 py-3 text-sm font-semibold text-[#1f2937] shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#c7cad2] hover:bg-[#f8f9fb] hover:shadow-[0_16px_30px_rgba(17,24,39,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none disabled:shadow-sm"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                  >
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.9-.1-1.3H12z"
                    />
                    <path
                      fill="#34A853"
                      d="M3.6 7.8l3.2 2.4C7.6 8 9.6 6.5 12 6.5c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 8.4 2.5 5.3 4.5 3.6 7.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12 21.5c2.5 0 4.6-.8 6.2-2.2l-3-2.4c-.8.5-1.9.9-3.2.9-2.4 0-4.5-1.6-5.2-3.9l-3.2 2.5c1.7 3.3 4.8 5.1 8.4 5.1z"
                    />
                    <path
                      fill="#4285F4"
                      d="M21.1 14.2c0-.5 0-.9-.1-1.3H12v3.9h5.5c-.3 1.2-1 2.2-2.2 3l3 2.4c1.8-1.7 2.8-4.2 2.8-8z"
                    />
                  </svg>
                  {submitting ? 'redirecionando...' : 'continuar com Google'}
                </span>
              </button>

              {errorMessage && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p>
              )}
            </div>

            <div className="mt-6 grid gap-2 text-xs text-muted sm:grid-cols-3">
              <p className="rounded-lg border border-border bg-bg/70 px-3 py-2 text-center">sem senha</p>
              <p className="rounded-lg border border-border bg-bg/70 px-3 py-2 text-center">conta instantanea</p>
              <p className="rounded-lg border border-border bg-bg/70 px-3 py-2 text-center">sessao segura</p>
            </div>
          </section>

          <aside className="reveal-up rounded-2xl border border-border bg-surface/90 p-6 sm:p-8 [animation-delay:120ms]">
            <h2 className="text-xl font-semibold">O que voce desbloqueia ao entrar</h2>

            <div className="mt-5 space-y-3">
              <article className="rounded-xl border border-border bg-bg/65 p-4">
                <p className="text-sm font-medium">Painel unico da carteira</p>
                <p className="mt-1 text-sm text-muted">Total investido, valor atual e renda mensal estimada no mesmo contexto.</p>
              </article>
              <article className="rounded-xl border border-border bg-bg/65 p-4">
                <p className="text-sm font-medium">Proventos com elegibilidade</p>
                <p className="mt-1 text-sm text-muted">Entenda o que entra no mes com visao por ativo e periodo.</p>
              </article>
              <article className="rounded-xl border border-border bg-bg/65 p-4">
                <p className="text-sm font-medium">Simuladores para decisao</p>
                <p className="mt-1 text-sm text-muted">Teste aportes e cenarios antes de executar.</p>
              </article>
            </div>

            <p className="mt-6 rounded-lg border border-border bg-bg/60 p-3 text-xs text-muted">
              As rotas `/app/*` exigem sessao valida. Sua conta fica vinculada ao login Google no Supabase.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Login;
