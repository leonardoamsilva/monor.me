import Card from "../components/Card";
import { useFiis } from "../hooks/useFiis";
import AllocationChart from "../components/AllocationChart";
import { useDividends } from "../hooks/useDividends";
import { useCurrentMonth } from "../hooks/useCurrentMonth";

function Dashboard() {
  const { fiis, refreshingQuotes, refreshFiisQuotes } = useFiis();
  const currentMonth = useCurrentMonth();
  const {
    monthlyPortfolioTotal,
    yearlyPortfolioTotal,
    yearlyPeriodLabel,
    allTimePortfolioTotal,
    allTimePeriodLabel,
    loading: loadingDividends,
  } = useDividends(
    fiis,
    currentMonth
  );

  const totalInvested = fiis.reduce((total, fii) => total + fii.cotas * fii.precoMedio, 0);
  const totalCurrentValue = fiis.reduce((total, fii) => {
    const currentPrice = Number(fii.valorAtual ?? fii.precoMedio);
    return total + fii.cotas * currentPrice;
  }, 0);
  const monthlyIncome = fiis.reduce((total, fii) => total + Number(fii.rendaMensal), 0);
  const yieldMonthly = totalInvested > 0 ? (monthlyIncome / totalInvested) * 100 : 0;

  const totalAtivos = fiis.length;
  const totalQuotas = fiis.reduce((total, fii) => total + fii.cotas, 0);
  const yearlyIncome = monthlyIncome * 12;

  const higherPosition = fiis.length > 0 ? fiis.reduce((bigger, fii) => {
    const currentPrice = Number(fii.valorAtual ?? fii.precoMedio);
    const value = fii.cotas * currentPrice;
    return value > bigger.value ? { ticker: fii.ticker, value } : bigger;
  }, { ticker: "", value: 0 }) : null;

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">dashboard</h1>
        <p className="text-muted">bem-vindo ao monor.me</p>
        <div className="mt-2 flex items-center gap-3">
          <p className="text-xs text-muted">
            cotações: {refreshingQuotes ? "atualizando..." : "sincronização diária automática"}
          </p>
          <button
            type="button"
            onClick={() => refreshFiisQuotes(true)}
            disabled={refreshingQuotes}
            className="px-2.5 py-1 text-xs rounded-md border border-border text-muted hover:text-text hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            atualizar agora (teste)
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card title="valor da carteira" value={`R$ ${totalCurrentValue.toFixed(2)}`} />
        <Card title="renda mensal (estimativa)" value={`R$ ${monthlyIncome.toFixed(2)}`} />
        <Card title="yield médio (mensal)" value={`${yieldMonthly.toFixed(2)}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card
          title="proventos reais do mês"
          value={loadingDividends ? "carregando..." : `R$ ${monthlyPortfolioTotal.toFixed(2)}`}
          info="Estimativa baseada na posicao atual. O direito ao provento depende da data-com e da data de compra."
        />
        <Card
          title="proventos reais no ano"
          value={loadingDividends ? "carregando..." : `R$ ${yearlyPortfolioTotal.toFixed(2)}`}
          info={`Acumulado no ano usando a posicao atual para os meses consultados.${yearlyPeriodLabel ? ` Periodo: ${yearlyPeriodLabel}.` : ''}`}
        />
        <Card
          title="proventos reais (todos os anos)"
          value={loadingDividends ? "carregando..." : `R$ ${allTimePortfolioTotal.toFixed(2)}`}
          info={`Acumulado total desde a entrada do usuario.${allTimePeriodLabel ? ` Periodo: ${allTimePeriodLabel}.` : ''}`}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
        <Card title="total de ativos" value={totalAtivos} />
        <Card title="total de cotas na carteira" value={totalQuotas} />
        <Card title="renda anual (estimativa)" value={`R$ ${yearlyIncome.toFixed(2)}`} />
        {higherPosition && (
          <Card title="maior posição" value={higherPosition.ticker} />
        )}
      </div>
        <div className="mt-6 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">alocação da carteira</h2>
          <AllocationChart fiis={fiis} />
        </div>

    </div>
  )
}

export default Dashboard;