import { Link } from 'react-router-dom';
import RevealOnScroll from '../components/ui/RevealOnScroll';

function Landing() {
  return (
    <div className="landing-shell page-open-fade relative min-h-screen overflow-x-hidden bg-bg text-text">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-bg/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="text-lg font-bold tracking-tight">monor<span className="text-accent">.me</span></div>
          <Link
            to="/login"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_12px_24px_rgba(37,99,235,0.3)]"
          >
            entrar
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="text-center">
          <RevealOnScroll delay={30}>
            <h1 className="text-5xl font-bold leading-tight sm:text-6xl">
              Carteira de FIIs
              <span className="block text-accent">com contexto real</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
              Veja sua rentabilidade, simule aportes e tome decisões informadas com dados consistentes em um único lugar.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/login"
                className="rounded-lg border border-accent bg-accent px-6 py-3 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_16px_32px_rgba(37,99,235,0.3)]"
              >
                começar agora
              </Link>
              <div className="text-sm text-muted">
                <span className="font-medium">Setup em 1 min.</span> Sem precisar de senha.
              </div>
            </div>
          </RevealOnScroll>
        </section>

        {/* Feature Grid - Simplified */}
        <section className="mt-20 grid gap-8 md:grid-cols-3">
          <RevealOnScroll delay={50}>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-accent">📊</div>
              <h3 className="text-lg font-semibold">Carteira Centralizada</h3>
              <p className="text-sm text-muted">Adicione tickers e acompanhe seu patrimônio em tempo real.</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-accent">💰</div>
              <h3 className="text-lg font-semibold">Proventos Claros</h3>
              <p className="text-sm text-muted">Veja datas, valores e projeções de renda mensais.</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={150}>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-accent">🎯</div>
              <h3 className="text-lg font-semibold">Simuladores</h3>
              <p className="text-sm text-muted">Teste cenários de aporte antes de sua próxima decisão.</p>
            </div>
          </RevealOnScroll>
        </section>

        {/* CTA Section */}
        <section className="mt-20 border-t border-border/40 pt-20">
          <RevealOnScroll delay={80}>
            <div className="text-center">
              <h2 className="text-3xl font-bold">Pronto para começar?</h2>
              <p className="mt-4 text-muted">Entre com Google. Zero complicações.</p>
              <div className="mt-8">
                <Link
                  to="/login"
                  className="inline-block rounded-lg border border-accent bg-accent px-8 py-3 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_16px_32px_rgba(37,99,235,0.3)]"
                >
                  entrar com google
                </Link>
              </div>
            </div>
          </RevealOnScroll>
        </section>
      </main>
    </div>
  );
}

export default Landing;
