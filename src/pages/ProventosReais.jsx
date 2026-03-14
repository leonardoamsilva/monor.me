import { useMemo, useState } from 'react';
import Card from '../components/Card';
import { useFiis } from '../hooks/useFiis';
import { useDividends } from '../hooks/useDividends';
import { formatCurrency } from '../utils/format';
import { useCurrentMonth } from '../hooks/useCurrentMonth';

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
}

function ProventosReais() {
  const { fiis } = useFiis();
  const currentMonth = useCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [autoCurrentMonth, setAutoCurrentMonth] = useState(true);
  const [pendingConfirmationRow, setPendingConfirmationRow] = useState(null);
  const activeMonth = autoCurrentMonth ? currentMonth : selectedMonth;
  const {
    rows,
    monthlyPortfolioTotal,
    yearlyPortfolioTotal,
    yearlyPeriodLabel,
    allTimePortfolioTotal,
    allTimePeriodLabel,
    loading,
    error,
    confirmDividendEligibility,
    revokeDividendEligibility,
  } = useDividends(fiis, activeMonth);

  const portfolioRows = useMemo(
    () => rows.filter((row) => row.inPortfolio).sort((a, b) => b.portfolioAmount - a.portfolioAmount),
    [rows]
  );

  const portfolioTickerSet = useMemo(
    () => new Set(fiis.map((fii) => String(fii.ticker ?? '').trim().toUpperCase())),
    [fiis]
  );

  const allRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aInPortfolio = portfolioTickerSet.has(String(a.ticker ?? '').trim().toUpperCase());
        const bInPortfolio = portfolioTickerSet.has(String(b.ticker ?? '').trim().toUpperCase());

        if (aInPortfolio !== bInPortfolio) {
          return aInPortfolio ? -1 : 1;
        }

        const byTicker = String(a.ticker ?? '').localeCompare(String(b.ticker ?? ''), 'pt-BR');
        if (byTicker !== 0) return byTicker;
        return String(a.paymentDate ?? '').localeCompare(String(b.paymentDate ?? ''));
      }),
    [portfolioTickerSet, rows]
  );

  const portfolioRowsInTable = useMemo(
    () => allRows.filter((row) => portfolioTickerSet.has(String(row.ticker ?? '').trim().toUpperCase())),
    [allRows, portfolioTickerSet]
  );

  const otherRowsInTable = useMemo(
    () => allRows.filter((row) => !portfolioTickerSet.has(String(row.ticker ?? '').trim().toUpperCase())),
    [allRows, portfolioTickerSet]
  );

  function handleConfirmManualEligibility() {
    if (!pendingConfirmationRow) return;
    confirmDividendEligibility(pendingConfirmationRow, activeMonth);
    setPendingConfirmationRow(null);
  }

  function renderTableRow(row, hideBottomBorder = false) {
    const showManualConfirmationAction = row.canConfirmManually && !row.manuallyConfirmed;

    return (
      <tr key={`${row.ticker}-${row.comDate ?? 'na'}`} className={hideBottomBorder ? '' : 'border-b border-border/50'}>
        <td className={`py-3 font-medium ${row.inPortfolio ? 'text-text' : 'text-muted'}`}>{row.ticker}</td>
        <td className="py-3">{row.type ?? '-'}</td>
        <td className="py-3">{formatCurrency(row.valuePerShare)}</td>
        <td className="py-3">{formatDate(row.comDate)}</td>
        <td className="py-3">{formatDate(row.paymentDate)}</td>
        <td className="py-3">
          {row.inPortfolio ? formatCurrency(row.portfolioAmount) : '-'}
          {row.manuallyConfirmed && (
            <>
              <span className="ml-2 text-[11px] text-accent">confirmado manualmente</span>
              <button
                type="button"
                onClick={() => revokeDividendEligibility(row, activeMonth)}
                className="ml-2 px-2 py-1 text-xs rounded-md border border-border/80 text-muted hover:text-text hover:bg-surface-hover cursor-pointer transition-all duration-200"
              >
                desfazer
              </button>
            </>
          )}
          {showManualConfirmationAction && (
            <button
              type="button"
              onClick={() => setPendingConfirmationRow(row)}
              className="ml-2 px-2 py-1 text-xs rounded-md border border-border/80 text-muted cursor-pointer hover:text-accent hover:border-accent/60 hover:bg-accent/10 transition-all duration-200"
            >
              comprei antes da data-com
            </button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">proventos reais</h1>
        <p className="text-muted">valores e datas do mes selecionado</p>
      </header>

      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm text-muted" htmlFor="month-filter">mes</label>
        <input
          id="month-filter"
          type="month"
          value={activeMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setAutoCurrentMonth(false);
          }}
          className="bg-bg border border-border rounded-lg px-3 py-2 text-text"
        />
        <button
          type="button"
          onClick={() => {
            setAutoCurrentMonth(true);
          }}
          className="px-3 py-2 text-sm rounded-lg border border-border text-muted hover:bg-surface-hover hover:text-text cursor-pointer transition-colors"
        >
          usar mes atual automático
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card
          title="proventos reais do mes (carteira)"
          value={loading ? 'carregando...' : formatCurrency(monthlyPortfolioTotal)}
          info="estimativa baseada na posição atual. O direito ao provento depende da data-com e data da compra."
        />
        <Card
          title="proventos reais no ano (carteira)"
          value={loading ? 'carregando...' : formatCurrency(yearlyPortfolioTotal)}
          info={`Acumulado no ano com base na posição atual para cada mes consultado.${yearlyPeriodLabel ? ` Periodo: ${yearlyPeriodLabel}.` : ''}`}
        />
        <Card
          title="proventos reais total (carteira)"
          value={loading ? 'carregando...' : formatCurrency(allTimePortfolioTotal)}
          info={`Acumulado de todos os anos desde a entrada do usuário.${allTimePeriodLabel ? ` Período: ${allTimePeriodLabel}.` : ''}`}
        />
      </div>

      {error && (
        <p className="text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-2 mb-6">{error}</p>
      )}

      <section className="bg-surface border border-border rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">destaques da carteira</h2>
        {portfolioRows.length === 0 ? (
          <p className="text-muted">nenhum ativo da carteira com provento para este mês</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {portfolioRows.map((row) => (
              <div key={`${row.ticker}-highlight`} className="border border-border rounded-lg p-2.5 bg-bg/40">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-semibold text-text">{row.ticker}</p>
                  <span className="text-[9px] uppercase tracking-wide text-muted border border-border rounded px-1 py-0.5">
                    {row.type ?? '-'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-text">{formatCurrency(row.portfolioAmount)}</p>
                <p className="text-[11px] text-muted">{row.quotas} cotas x {formatCurrency(row.valuePerShare)}</p>
                <p className="text-[11px] text-muted mt-0.5 leading-tight">
                  com: {formatDate(row.comDate)} | pag: {formatDate(row.paymentDate)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">todos os proventos do mês</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 text-muted font-medium">ativo</th>
                <th className="pb-3 text-muted font-medium">tipo</th>
                <th className="pb-3 text-muted font-medium">valor por cota</th>
                <th className="pb-3 text-muted font-medium">data com</th>
                <th className="pb-3 text-muted font-medium">data pagamento</th>
                <th className="pb-3 text-muted font-medium">valor na carteira</th>
              </tr>
            </thead>
            <tbody>
              {portfolioRowsInTable.length > 0 && (
                <tr>
                  <td colSpan={6} className="py-2 px-1 border-0">
                    <div className="flex items-center gap-3 leading-none">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">na carteira</span>
                      <span className="flex-1 border-t border-border/35" />
                    </div>
                  </td>
                </tr>
              )}
              {portfolioRowsInTable.map((row, index) =>
                renderTableRow(row, index === portfolioRowsInTable.length - 1)
              )}

              {otherRowsInTable.length > 0 && (
                <tr>
                  <td colSpan={6} className="py-2 px-1 border-0">
                    <div className="flex items-center gap-3 leading-none">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">outros ativos</span>
                      <span className="flex-1 border-t border-border/35" />
                    </div>
                  </td>
                </tr>
              )}
              {otherRowsInTable.map(renderTableRow)}
            </tbody>
          </table>
          {allRows.length === 0 && !loading && (
            <p className="text-muted py-4">nenhum provento encontrado para este mês</p>
          )}
        </div>
      </section>

      {pendingConfirmationRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="fechar modal"
            onClick={() => setPendingConfirmationRow(null)}
            className="absolute inset-0 bg-black/45 cursor-pointer"
          />

          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-text">confirmar provento</h3>
            <p className="mt-2 text-sm text-muted">
              voce confirma que comprou <strong className="text-text">{pendingConfirmationRow.ticker}</strong> antes da
              data-com e deseja incluir esse provento nos calculos?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingConfirmationRow(null)}
                className="px-3 py-2 text-sm rounded-lg border border-border text-muted hover:text-text hover:bg-surface-hover cursor-pointer transition-colors"
              >
                cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmManualEligibility}
                className="px-3 py-2 text-sm rounded-lg border border-accent/50 bg-accent/15 text-accent hover:bg-accent/25 cursor-pointer transition-colors"
              >
                confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProventosReais;
