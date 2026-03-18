import { useState } from 'react';
import {
  isSupabaseConfigured,
  signInWithGoogle,
  syncGoogleProfile,
} from '../services/auth';

function Login() {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleGoogleSignIn() {
    setErrorMessage('');
    setSubmitting(true);

    try {
      await signInWithGoogle();
      // Após redirect, syncGoogleProfile será chamado automaticamente pelo AuthContext
      // Mas enquanto espera o redirect, deixamos submitting como true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao iniciar Google login.');
      setSubmitting(false);
    }
  }

  return (
    <div className="landing-shell page-open-fade relative min-h-screen overflow-x-hidden bg-bg text-text">
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-4xl font-bold">monor<span className="text-accent">.me</span></h1>

          <p className="mt-8 text-xl font-semibold">Bem-vindo</p>
          <p className="mt-2 text-muted">Entre com sua conta Google para acessar sua carteira.</p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              disabled={submitting || !isSupabaseConfigured}
              onClick={handleGoogleSignIn}
              className="w-full rounded-lg border border-[#d6d8de] bg-white px-4 py-3 text-sm font-semibold text-[#1f2937] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c7cad2] hover:bg-[#f8f9fb] hover:shadow-[0_12px_24px_rgba(17,24,39,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none"
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

            {!isSupabaseConfigured && (
              <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                Supabase não configurado. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env`.
              </p>
            )}
          </div>

          <p className="mt-8 text-xs text-muted">
            Sem senha. Sua conta é criada automaticamente no primeiro login.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
