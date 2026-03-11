import { useMemo, useState } from "react";
import Card from "../components/Card";
import MoneyInput from "../components/ui/MoneyInput";
import { formatCurrency } from "../utils/format";

const SIMULATOR_OPTIONS = [
  {
    id: "compound-interest",
    name: "juros compostos",
    description: "simulação de aporte mensal + taxa fixa",
    status: "ready",
  },
  {
    id: "target-income",
    name: "meta por ativo",
    description: "quanto precisa investir para atingir renda alvo",
    status: "coming-soon",
  },
  {
    id: "portfolio-projection",
    name: "carteira atual",
    description: "projeção usando os ativos já cadastrados",
    status: "coming-soon",
  },
];

function calculateCompoundInterest({ initialAmount, monthlyContribution, monthlyRate, months }) {
  const monthlyRateDecimal = monthlyRate / 100;

  if (months <= 0) {
    return {
      finalAmount: initialAmount,
      investedAmount: initialAmount,
      interestAmount: 0,
      monthlySnapshots: [],
    };
  }

  if (monthlyRateDecimal === 0) {
    const investedAmount = initialAmount + monthlyContribution * months;
    return {
      finalAmount: investedAmount,
      investedAmount,
      interestAmount: 0,
      monthlySnapshots: Array.from({ length: months }, (_, index) => ({
        month: index + 1,
        amount: initialAmount + monthlyContribution * (index + 1),
      })),
    };
  }

  const compoundedInitial = initialAmount * (1 + monthlyRateDecimal) ** months;
  const compoundedContributions = monthlyContribution
    * (((1 + monthlyRateDecimal) ** months - 1) / monthlyRateDecimal);
  const finalAmount = compoundedInitial + compoundedContributions;
  const investedAmount = initialAmount + monthlyContribution * months;

  const monthlySnapshots = [];
  let runningAmount = initialAmount;

  for (let month = 1; month <= months; month += 1) {
    runningAmount = runningAmount * (1 + monthlyRateDecimal) + monthlyContribution;
    monthlySnapshots.push({ month, amount: runningAmount });
  }

  return {
    finalAmount,
    investedAmount,
    interestAmount: finalAmount - investedAmount,
    monthlySnapshots,
  };
}

function SimulatorTypeSelector({ selectedOption, onSelectOption }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">tipos de simulador</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SIMULATOR_OPTIONS.map((option) => {
          const isSelected = selectedOption === option.id;
          const isReady = option.status === "ready";

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => isReady && onSelectOption(option.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-border hover:bg-surface-hover"
              } ${isReady ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-medium text-text">{option.name}</p>
                <span
                  className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ${
                    isReady
                      ? "text-success border-success/30 bg-success/10"
                      : "text-muted border-border bg-bg"
                  }`}
                >
                  {isReady ? "disponivel" : "em breve"}
                </span>
              </div>
              <p className="text-xs text-muted">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompoundInterestSimulator() {
  const [initialAmount, setInitialAmount] = useState(0);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [annualRateInput, setAnnualRateInput] = useState("");
  const [yearsInput, setYearsInput] = useState("");

  const parsedAnnualRate = Number(annualRateInput || 0);
  const parsedYears = Number(yearsInput || 0);
  const annualRate = Number.isFinite(parsedAnnualRate) ? Math.max(0, parsedAnnualRate) : 0;
  const years = Number.isFinite(parsedYears) ? Math.max(0, parsedYears) : 0;
  const monthlyRateEquivalent = annualRate > 0
    ? ((1 + annualRate / 100) ** (1 / 12) - 1) * 100
    : 0;
  const totalMonths = Math.max(0, Math.round(years * 12));

  const result = useMemo(
    () =>
      calculateCompoundInterest({
        initialAmount: Number(initialAmount) || 0,
        monthlyContribution: Number(monthlyContribution) || 0,
        monthlyRate: monthlyRateEquivalent,
        months: totalMonths,
      }),
    [initialAmount, monthlyContribution, monthlyRateEquivalent, totalMonths]
  );

  const yearlySnapshots = result.monthlySnapshots.filter((row) => row.month % 12 === 0);
  const totalReturnPercent = result.investedAmount > 0
    ? (result.interestAmount / result.investedAmount) * 100
    : 0;

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">parâmetros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoneyInput
            id="initial-amount"
            label="valor inicial"
            value={initialAmount}
            onValueChange={setInitialAmount}
          />
          <MoneyInput
            id="monthly-contribution"
            label="aporte mensal"
            value={monthlyContribution}
            onValueChange={setMonthlyContribution}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="annual-rate" className="text-sm text-muted">taxa de juros anual (%)</label>
            <input
              id="annual-rate"
              type="number"
              min="0"
              step="0.01"
              value={annualRateInput}
              onChange={(event) => setAnnualRateInput(event.target.value)}
              className="bg-bg border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
              placeholder="0"
            />
            <p className="text-xs text-muted">
              equivalente mensal: {monthlyRateEquivalent.toFixed(4)}%
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="years" className="text-sm text-muted">prazo (anos)</label>
            <input
              id="years"
              type="number"
              min="0"
              step="0.5"
              value={yearsInput}
              onChange={(event) => setYearsInput(event.target.value)}
              className="bg-bg border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card title="montante final" value={formatCurrency(result.finalAmount)} />
        <Card title="total investido" value={formatCurrency(result.investedAmount)} />
        <Card title="juros acumulados" value={formatCurrency(result.interestAmount)} />
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold">resumo</h2>
        <p className="text-sm text-muted mt-2">
          em {totalMonths} meses, o valor projetado e {formatCurrency(result.finalAmount)}.
        </p>
        <p className="text-sm text-muted">
          retorno sobre o capital investido: {Number.isFinite(totalReturnPercent) ? `${totalReturnPercent.toFixed(2)}%` : "0,00%"}.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">evolução anual</h2>
        {yearlySnapshots.length === 0 ? (
          <p className="text-sm text-muted">defina um prazo maior que zero para ver a evolução.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-muted font-medium">ano</th>
                  <th className="pb-3 text-muted font-medium">mês</th>
                  <th className="pb-3 text-muted font-medium">montante</th>
                </tr>
              </thead>
              <tbody>
                {yearlySnapshots.map((row) => (
                  <tr key={row.month} className="border-b border-border/50">
                    <td className="py-3">{Math.ceil(row.month / 12)}</td>
                    <td className="py-3">{row.month}</td>
                    <td className="py-3">{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function SimuladorAportes() {
  const [selectedOption, setSelectedOption] = useState("compound-interest");

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">simulador de aportes</h1>
        <p className="text-muted">escolha o modelo de simulação; novos modos serão adicionados nesta página</p>
      </header>

      <SimulatorTypeSelector selectedOption={selectedOption} onSelectOption={setSelectedOption} />

      {selectedOption === "compound-interest" && <CompoundInterestSimulator />}
    </div>
  );
}

export default SimuladorAportes;
