import { Link } from 'react-router-dom';
import RevealOnScroll from '../components/ui/RevealOnScroll';

function Landing() {
  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <div className="landing-shell page-open-fade relative min-h-screen overflow-x-hidden bg-bg text-text">
      <div className="pointer-events-none absolute -left-36 top-[-140px] h-[25rem] w-[25rem] rounded-full bg-accent/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[-110px] top-[220px] h-[21rem] w-[21rem] rounded-full bg-success/18 blur-3xl" aria-hidden="true" />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/86 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="text-xl font-bold tracking-tight">monor<span className="text-accent">.me</span></div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-muted transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-surface-hover hover:text-text hover:shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
            >
              entrar
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-accent/70 bg-accent px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_14px_28px_rgba(37,99,235,0.38)]"
            >
              comecar
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="grid items-start gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <RevealOnScroll delay={30}>
            <p className="mb-4 inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-[0.15em] text-muted">
              investimento guiado por dados e contexto
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-[3.4rem]">
              Sua carteira de FIIs,
              <span className="block text-accent">com leitura para decisao diaria.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted sm:text-lg">
              O monor.me junta carteira, proventos reais e simuladores em um fluxo unico para tirar voce do escuro antes do proximo aporte.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/login"
                className="rounded-lg border border-accent bg-accent px-5 py-3 text-center font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_16px_30px_rgba(37,99,235,0.36)]"
              >
                entrar com google
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('como-funciona')}
                className="rounded-lg border border-border bg-transparent px-5 py-3 text-center font-medium text-text transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-surface hover:shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
              >
                ver como funciona
              </button>
            </div>

            <div className="mt-9 grid grid-cols-3 gap-3 text-center">
              <article className="rounded-xl border border-border bg-surface/75 p-3">
                <p className="text-xs text-muted">configuracao</p>
                <p className="mt-1 text-xl font-semibold">1 min</p>
              </article>
              <article className="rounded-xl border border-border bg-surface/75 p-3">
                <p className="text-xs text-muted">experiencia</p>
                <p className="mt-1 text-xl font-semibold">fluida</p>
              </article>
              <article className="rounded-xl border border-border bg-surface/75 p-3">
                <p className="text-xs text-muted">foco</p>
                <p className="mt-1 text-xl font-semibold">renda</p>
              </article>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={120}>
            <div className="rounded-2xl border border-border bg-surface/90 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.34)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">painel rapido</p>
                <span className="rounded-full border border-success/35 bg-success/10 px-2 py-1 text-xs text-success">online</span>
              </div>

              <div className="space-y-3">
                <article className="rounded-xl border border-border bg-bg/70 p-4">
                  <p className="text-xs text-muted">patrimonio total</p>
                  <p className="mt-1 text-2xl font-semibold">R$ 128.420,00</p>
                  <p className="mt-2 text-xs text-success">+3.2% em relacao ao ultimo fechamento</p>
                </article>
                <article className="rounded-xl border border-border bg-bg/70 p-4">
                  <p className="text-xs text-muted">proventos estimados no mes</p>
                  <p className="mt-1 text-2xl font-semibold">R$ 1.486,25</p>
                  <p className="mt-2 text-xs text-muted">9 ativos com elegibilidade atual</p>
                </article>
                <article className="rounded-xl border border-border bg-bg/70 p-4">
                  <p className="text-xs text-muted">meta de renda mensal</p>
                  <p className="mt-1 text-sm text-text">R$ 2.000,00</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full border border-border bg-surface">
                    <div className="h-full w-[74%] bg-accent" />
                  </div>
                </article>
              </div>
            </div>
          </RevealOnScroll>
        </section>

        <section id="como-funciona" className="mt-16 grid gap-4 md:grid-cols-3">
          <RevealOnScroll delay={30}>
            <article className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">etapa 1</p>
              <h2 className="mt-2 text-lg font-semibold">Monte sua carteira</h2>
              <p className="mt-2 text-sm text-muted">Adicione tickers e cotas com dados consistentes no Supabase.</p>
            </article>
          </RevealOnScroll>
          <RevealOnScroll delay={120}>
            <article className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">etapa 2</p>
              <h2 className="mt-2 text-lg font-semibold">Acompanhe proventos</h2>
              <p className="mt-2 text-sm text-muted">Veja datas e valores com leitura clara por ativo e por periodo.</p>
            </article>
          </RevealOnScroll>
          <RevealOnScroll delay={210}>
            <article className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">etapa 3</p>
              <h2 className="mt-2 text-lg font-semibold">Decida o aporte</h2>
              <p className="mt-2 text-sm text-muted">Use simuladores para escolher o proximo movimento com contexto.</p>
            </article>
          </RevealOnScroll>
        </section>

        <RevealOnScroll delay={60}>
          <section className="mt-14 rounded-2xl border border-border bg-surface/90 p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted">vantagens no dia 1</p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Estrutura pronta para escalar com planos</h2>
                <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
                  Hoje voce entra com Google e centraliza sua carteira na nuvem. Amanha, libera recursos premium por plano sem retrabalho.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/login"
                    className="rounded-lg border border-accent bg-accent px-5 py-3 text-center font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_14px_28px_rgba(37,99,235,0.36)]"
                  >
                    quero testar agora
                  </Link>
                  <button
                    type="button"
                    onClick={() => scrollToSection('faq')}
                    className="rounded-lg border border-border bg-transparent px-5 py-3 text-center font-medium text-text transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-bg/60 hover:shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
                  >
                    ver duvidas
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-bg/70 p-4 sm:p-5">
                <h3 className="text-sm font-semibold">incluido</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li className="rounded-lg border border-border bg-surface/55 px-3 py-2">Login Google e sessao segura.</li>
                  <li className="rounded-lg border border-border bg-surface/55 px-3 py-2">Carteira persistida no Supabase.</li>
                  <li className="rounded-lg border border-border bg-surface/55 px-3 py-2">Base pronta para limitar ativos por plano.</li>
                </ul>
              </div>
            </div>
          </section>
        </RevealOnScroll>

        <section id="faq" className="mt-10 grid gap-4 md:grid-cols-3">
          <RevealOnScroll delay={20}>
            <article className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold">Precisa senha?</h3>
              <p className="mt-2 text-sm text-muted">Nao. O onboarding inicial usa apenas conta Google.</p>
            </article>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <article className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold">Dados ficam onde?</h3>
              <p className="mt-2 text-sm text-muted">Carteira e usuario ficam no Supabase, com controle por sessao.</p>
            </article>
          </RevealOnScroll>
          <RevealOnScroll delay={180}>
            <article className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold">Vai ter planos?</h3>
              <p className="mt-2 text-sm text-muted">Sim. A base de entitlements/assinatura ja esta no roadmap atual.</p>
            </article>
          </RevealOnScroll>
        </section>

        <RevealOnScroll delay={80}>
          <section className="mt-10 rounded-2xl border border-accent/30 bg-accent/12 p-6 text-center">
            <h3 className="text-xl font-bold">Vamos colocar sua carteira no controle?</h3>
            <p className="mt-2 text-sm text-muted">Entre com Google e configure tudo em menos de 1 minuto.</p>
            <div className="mt-5 flex justify-center">
              <Link
                to="/login"
                className="rounded-lg border border-accent bg-accent px-6 py-3 text-center font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_16px_30px_rgba(37,99,235,0.38)]"
              >
                entrar com google
              </Link>
            </div>
          </section>
        </RevealOnScroll>
      </main>
    </div>
  );
}

export default Landing;
