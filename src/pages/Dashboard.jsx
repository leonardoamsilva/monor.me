import Card from "../components/Card";
import { useFiis } from "../hooks/useFiis";
import AllocationChart from "../components/AllocationChart";
import { useDividends } from "../hooks/useDividends";
import { useCurrentMonth } from "../hooks/useCurrentMonth";
import { useSettings } from "../hooks/useSettings";
import { formatCurrency } from "../utils/format";

function Dashboard() {
  const { fiis, refreshingQuotes, refreshFiisQuotes } = useFiis();
  const { settings } = useSettings();
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
  const incomeGoalMonthly = Number(settings.incomeGoalMonthly ?? 0);
  const incomeGoalProgress = incomeGoalMonthly > 0
    ? Math.min((monthlyIncome / incomeGoalMonthly) * 100, 100)
    : 0;
  const incomeGoalRemaining = Math.max(incomeGoalMonthly - monthlyIncome, 0);

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
        <Card title="valor da carteira" value={formatCurrency(totalCurrentValue)} />
        <Card title="renda mensal (estimativa)" value={formatCurrency(monthlyIncome)} />
        <Card title="yield médio (mensal)" value={`${yieldMonthly.toFixed(2)}%`} />
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">meta de renda mensal</h2>
            <p className="text-sm text-muted">
              {incomeGoalMonthly > 0
                ? `${formatCurrency(monthlyIncome)} de ${formatCurrency(incomeGoalMonthly)} atingidos`
                : "defina uma meta em configurações para acompanhar seu progresso"}
            </p>
          </div>
          {incomeGoalMonthly > 0 && (
            <strong className="text-2xl text-text">{incomeGoalProgress.toFixed(1)}%</strong>
          )}
        </div>

        {incomeGoalMonthly > 0 && (
          <>
            <div className="mt-4 h-2 w-full rounded-full bg-bg border border-border overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${incomeGoalProgress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted">
              {incomeGoalRemaining > 0
                ? `faltam ${formatCurrency(incomeGoalRemaining)} para bater a meta.`
                : "meta atingida. parabens!"}
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card
          title="proventos reais do mês"
          value={loadingDividends ? "carregando..." : formatCurrency(monthlyPortfolioTotal)}
          info="Estimativa baseada na posicao atual. O direito ao provento depende da data-com e da data de compra."
        />
        <Card
          title="proventos reais no ano"
          value={loadingDividends ? "carregando..." : formatCurrency(yearlyPortfolioTotal)}
          info={`Acumulado no ano usando a posicao atual para os meses consultados.${yearlyPeriodLabel ? ` Periodo: ${yearlyPeriodLabel}.` : ''}`}
        />
        <Card
          title="proventos reais (todos os anos)"
          value={loadingDividends ? "carregando..." : formatCurrency(allTimePortfolioTotal)}
          info={`Acumulado total desde a entrada do usuario.${allTimePeriodLabel ? ` Periodo: ${allTimePeriodLabel}.` : ''}`}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
        <Card title="total de ativos" value={totalAtivos} />
        <Card title="total de cotas na carteira" value={totalQuotas} />
        <Card title="renda anual (estimativa)" value={formatCurrency(yearlyIncome)} />
        {higherPosition && (
          <Card title="maior posição" value={higherPosition.ticker} />
        )}
      </div>
        <div className="mt-6 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">alocação da carteira</h2>
          <AllocationChart
            fiis={fiis}
            chartType={settings.dashboardChartType}
            showLegend={settings.dashboardChartShowLegend}
            showLabels={settings.dashboardChartShowLabels}
          />
        </div>

    </div>
  )
}

export default Dashboard;