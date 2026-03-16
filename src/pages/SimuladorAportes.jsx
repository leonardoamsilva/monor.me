import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card";
import Button from "../components/ui/Button";
import MoneyInput from "../components/ui/MoneyInput";
import { useIsMobile } from "../hooks/useIsMobile";
import { withMinDelay } from "../utils/async";
import { formatCurrency } from "../utils/format";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SIMULATOR_OPTIONS = [
  {
    id: "compound-interest",
    name: "juros compostos",
    description: "simulação de aporte mensal + taxa fixa",
    status: "ready",
  },
  {
    id: "simple-interest",
    name: "juros simples",
    description: "simulação sem juros sobre juros",
    status: "ready",
  },
  {
    id: "loss-compensation",
    name: "compensação de prejuízo",
    description: "simulação de abatimento e imposto",
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
        invested: initialAmount + monthlyContribution * (index + 1),
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
    monthlySnapshots.push({
      month,
      amount: runningAmount,
      invested: initialAmount + monthlyContribution * month,
    });
  }

  return {
    finalAmount,
    investedAmount,
    interestAmount: finalAmount - investedAmount,
    monthlySnapshots,
  };
}

function calculateSimpleInterest({ initialAmount, monthlyRate, months }) {
  const monthlyRateDecimal = monthlyRate / 100;

  if (months <= 0) {
    return {
      finalAmount: initialAmount,
      investedAmount: initialAmount,
      interestAmount: 0,
      monthlySnapshots: [],
    };
  }

  const investedBase = initialAmount;
  let accumulatedInterest = 0;
  const monthlySnapshots = [];

  for (let month = 1; month <= months; month += 1) {
    const monthlyInterest = investedBase * monthlyRateDecimal;
    accumulatedInterest += monthlyInterest;

    monthlySnapshots.push({
      month,
      invested: investedBase,
      amount: investedBase + accumulatedInterest,
    });
  }

  const finalAmount = investedBase + accumulatedInterest;

  return {
    finalAmount,
    investedAmount: investedBase,
    interestAmount: accumulatedInterest,
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

function EvolutionTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0].payload;

  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-text text-sm font-medium">mes {item.month}</p>
      <p className="text-sm" style={{ color: "#3B82F6" }}>
        montante: {formatCurrency(item.amount)}
      </p>
      <p className="text-sm" style={{ color: "#F59E0B" }}>
        investido: {formatCurrency(item.invested)}
      </p>
    </div>
  );
}

function useManualSimulation(calculateFn, deps, minDelayMs = 450) {
  const calculateFnRef = useRef(calculateFn);
  const [result, setResult] = useState(() => calculateFn());
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    calculateFnRef.current = calculateFn;
  }, [calculateFn]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    setIsDirty(true);
  }, [...deps]);

  async function calculateNow() {
    setIsCalculating(true);

    try {
      await withMinDelay(async () => {
        setResult(calculateFnRef.current());
      }, minDelayMs);
      setIsDirty(false);
    } finally {
      setIsCalculating(false);
    }
  }

  return {
    result,
    isCalculating,
    isDirty,
    calculateNow,
  };
}

function CompoundInterestSimulator() {
  const isMobile = useIsMobile();
  const [showMobileChart, setShowMobileChart] = useState(false);
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

  const { result, isCalculating, calculateNow } = useManualSimulation(
    () =>
      calculateCompoundInterest({
        initialAmount: Number(initialAmount) || 0,
        monthlyContribution: Number(monthlyContribution) || 0,
        monthlyRate: monthlyRateEquivalent,
        months: totalMonths,
      }),
    [initialAmount, monthlyContribution, monthlyRateEquivalent, totalMonths],
    520
  );

  const yearlySnapshots = result.monthlySnapshots.filter((row) => row.month % 12 === 0);
  const annualTableRows = useMemo(() => {
    if (result.monthlySnapshots.length === 0) return [];

    const rows = [...yearlySnapshots];
    const lastSnapshot = result.monthlySnapshots[result.monthlySnapshots.length - 1];

    if (!rows.some((row) => row.month === lastSnapshot.month)) {
      rows.push(lastSnapshot);
    }

    return rows;
  }, [result.monthlySnapshots, yearlySnapshots]);
  const totalReturnPercent = result.investedAmount > 0
    ? (result.interestAmount / result.investedAmount) * 100
    : 0;

  function handleClear() {
    setInitialAmount(0);
    setMonthlyContribution(0);
    setAnnualRateInput("");
    setYearsInput("");
  }

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
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClear} disabled={isCalculating}>
            limpar
          </Button>
          <Button type="button" onClick={calculateNow} disabled={isCalculating}>
            {isCalculating ? "calculando..." : "calcular"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card
          title="montante final"
          value={isCalculating ? "calculando..." : formatCurrency(result.finalAmount)}
          info="valor projetado no fim do prazo: capital investido + rendimento acumulado."
        />
        <Card
          title="total investido"
          value={isCalculating ? "calculando..." : formatCurrency(result.investedAmount)}
          info="soma do valor inicial com todos os aportes feitos no periodo."
        />
        <Card
          title="juros acumulados"
          value={isCalculating ? "calculando..." : formatCurrency(result.interestAmount)}
          info="ganho total vindo dos juros ao longo do prazo."
        />
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

      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">evolução mensal (gráfico)</h2>
        <div className="flex items-center gap-4 mb-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" /> montante projetado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" /> total investido
          </span>
        </div>
        {result.monthlySnapshots.length === 0 ? (
          <p className="text-sm text-muted">defina um prazo maior que zero para visualizar o gráfico.</p>
        ) : isMobile && !showMobileChart ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg/35 px-3 py-3">
            <p className="text-sm text-muted">gráfico oculto para facilitar leitura no celular.</p>
            <Button type="button" variant="secondary" onClick={() => setShowMobileChart(true)}>
              ver gráfico
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="h-64 sm:h-72 min-w-[560px] sm:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.monthlySnapshots} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickFormatter={(value) => `m${value}`}
                />
                <YAxis
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<EvolutionTooltip />} animationDuration={0} wrapperStyle={{ outline: "none" }} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}
        {isMobile && showMobileChart && result.monthlySnapshots.length > 0 && (
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowMobileChart(false)}>
              ocultar gráfico
            </Button>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">evolução anual</h2>
        {annualTableRows.length === 0 ? (
          <p className="text-sm text-muted">defina um prazo maior que zero para ver a evolução.</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full">
              <thead className="bg-bg/60">
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-3 text-muted font-medium">período</th>
                  <th className="py-3 px-3 text-muted font-medium">mês</th>
                  <th className="py-3 px-3 text-muted font-medium">investido</th>
                  <th className="py-3 px-3 text-muted font-medium">montante</th>
                  <th className="py-3 px-3 text-muted font-medium">juros</th>
                  <th className="py-3 px-3 text-muted font-medium">retorno</th>
                </tr>
              </thead>
              <tbody>
                {annualTableRows.map((row) => {
                  const yearNumber = Math.ceil(row.month / 12);
                  const isPartialPeriod = row.month % 12 !== 0;
                  const interest = row.amount - row.invested;
                  const rowReturnPercent = row.invested > 0 ? (interest / row.invested) * 100 : 0;

                  return (
                    <tr key={row.month} className="border-b border-border/50 last:border-b-0 hover:bg-bg/30 transition-colors">
                      <td className="py-3 px-3">
                        <span className="text-text">ano {yearNumber}</span>
                        {isPartialPeriod && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-warning">parcial</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted">{row.month}</td>
                      <td className="py-3 px-3">{formatCurrency(row.invested)}</td>
                      <td className="py-3 px-3">{formatCurrency(row.amount)}</td>
                      <td className="py-3 px-3 text-accent">{formatCurrency(interest)}</td>
                      <td className="py-3 px-3 text-muted">{rowReturnPercent.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted px-3 py-2 border-t border-border bg-bg/40">
              {totalMonths % 12 !== 0
                ? "o último registro representa um período parcial do ano final."
                : "registros fechados ao final de cada ano."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function SimpleInterestSimulator() {
  const isMobile = useIsMobile();
  const [showMobileChart, setShowMobileChart] = useState(false);
  const [initialAmount, setInitialAmount] = useState(0);
  const [annualRateInput, setAnnualRateInput] = useState("");
  const [yearsInput, setYearsInput] = useState("");

  const parsedAnnualRate = Number(annualRateInput || 0);
  const parsedYears = Number(yearsInput || 0);
  const annualRate = Number.isFinite(parsedAnnualRate) ? Math.max(0, parsedAnnualRate) : 0;
  const years = Number.isFinite(parsedYears) ? Math.max(0, parsedYears) : 0;
  const monthlyRateEquivalent = annualRate / 12;
  const totalMonths = Math.max(0, Math.round(years * 12));

  const { result, isCalculating, calculateNow } = useManualSimulation(
    () =>
      calculateSimpleInterest({
        initialAmount: Number(initialAmount) || 0,
        monthlyRate: monthlyRateEquivalent,
        months: totalMonths,
      }),
    [initialAmount, monthlyRateEquivalent, totalMonths],
    520
  );

  const yearlySnapshots = result.monthlySnapshots.filter((row) => row.month % 12 === 0);
  const annualTableRows = useMemo(() => {
    if (result.monthlySnapshots.length === 0) return [];

    const rows = [...yearlySnapshots];
    const lastSnapshot = result.monthlySnapshots[result.monthlySnapshots.length - 1];

    if (!rows.some((row) => row.month === lastSnapshot.month)) {
      rows.push(lastSnapshot);
    }

    return rows;
  }, [result.monthlySnapshots, yearlySnapshots]);
  const totalReturnPercent = result.investedAmount > 0
    ? (result.interestAmount / result.investedAmount) * 100
    : 0;

  function handleClear() {
    setInitialAmount(0);
    setAnnualRateInput("");
    setYearsInput("");
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">parâmetros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoneyInput
            id="simple-initial-amount"
            label="valor inicial"
            value={initialAmount}
            onValueChange={setInitialAmount}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="simple-years" className="text-sm text-muted">prazo (anos)</label>
            <input
              id="simple-years"
              type="number"
              min="0"
              step="0.5"
              value={yearsInput}
              onChange={(event) => setYearsInput(event.target.value)}
              className="bg-bg border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
              placeholder="0"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="simple-annual-rate" className="text-sm text-muted">taxa de juros anual (%)</label>
            <input
              id="simple-annual-rate"
              type="number"
              min="0"
              step="0.01"
              value={annualRateInput}
              onChange={(event) => setAnnualRateInput(event.target.value)}
              className="bg-bg border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
              placeholder="0"
            />
            <p className="text-xs text-muted">
              equivalente mensal (simples): {monthlyRateEquivalent.toFixed(4)}%
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClear} disabled={isCalculating}>
            limpar
          </Button>
          <Button type="button" onClick={calculateNow} disabled={isCalculating}>
            {isCalculating ? "calculando..." : "calcular"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card
          title="montante final"
          value={isCalculating ? "calculando..." : formatCurrency(result.finalAmount)}
          info="valor final com juros simples, sem juros sobre juros."
        />
        <Card
          title="total investido"
          value={isCalculating ? "calculando..." : formatCurrency(result.investedAmount)}
          info="capital principal usado como base para o cálculo."
        />
        <Card
          title="juros acumulados"
          value={isCalculating ? "calculando..." : formatCurrency(result.interestAmount)}
          info="soma dos juros gerados ao longo do tempo sobre o principal."
        />
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

      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">evolução mensal (gráfico)</h2>
        <div className="flex items-center gap-4 mb-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" /> montante projetado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" /> total investido
          </span>
        </div>
        {result.monthlySnapshots.length === 0 ? (
          <p className="text-sm text-muted">defina um prazo maior que zero para visualizar o gráfico.</p>
        ) : isMobile && !showMobileChart ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg/35 px-3 py-3">
            <p className="text-sm text-muted">gráfico oculto para facilitar leitura no celular.</p>
            <Button type="button" variant="secondary" onClick={() => setShowMobileChart(true)}>
              ver gráfico
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="h-64 sm:h-72 min-w-[560px] sm:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.monthlySnapshots} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickFormatter={(value) => `m${value}`}
                />
                <YAxis
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<EvolutionTooltip />} animationDuration={0} wrapperStyle={{ outline: "none" }} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}
        {isMobile && showMobileChart && result.monthlySnapshots.length > 0 && (
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowMobileChart(false)}>
              ocultar gráfico
            </Button>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">evolução anual</h2>
        {annualTableRows.length === 0 ? (
          <p className="text-sm text-muted">defina um prazo maior que zero para ver a evolução.</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full">
              <thead className="bg-bg/60">
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-3 text-muted font-medium">período</th>
                  <th className="py-3 px-3 text-muted font-medium">mês</th>
                  <th className="py-3 px-3 text-muted font-medium">investido</th>
                  <th className="py-3 px-3 text-muted font-medium">montante</th>
                  <th className="py-3 px-3 text-muted font-medium">juros</th>
                  <th className="py-3 px-3 text-muted font-medium">retorno</th>
                </tr>
              </thead>
              <tbody>
                {annualTableRows.map((row) => {
                  const yearNumber = Math.ceil(row.month / 12);
                  const isPartialPeriod = row.month % 12 !== 0;
                  const interest = row.amount - row.invested;
                  const rowReturnPercent = row.invested > 0 ? (interest / row.invested) * 100 : 0;

                  return (
                    <tr key={row.month} className="border-b border-border/50 last:border-b-0 hover:bg-bg/30 transition-colors">
                      <td className="py-3 px-3">
                        <span className="text-text">ano {yearNumber}</span>
                        {isPartialPeriod && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-warning">parcial</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted">{row.month}</td>
                      <td className="py-3 px-3">{formatCurrency(row.invested)}</td>
                      <td className="py-3 px-3">{formatCurrency(row.amount)}</td>
                      <td className="py-3 px-3 text-accent">{formatCurrency(interest)}</td>
                      <td className="py-3 px-3 text-muted">{rowReturnPercent.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted px-3 py-2 border-t border-border bg-bg/40">
              {totalMonths % 12 !== 0
                ? "o último registro representa um período parcial do ano final."
                : "registros fechados ao final de cada ano."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function LossCompensationSimulator() {
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [saleAmount, setSaleAmount] = useState(0);
  const [accumulatedLoss, setAccumulatedLoss] = useState(0);
  const [taxRateInput, setTaxRateInput] = useState("20");

  const { result: simulation, isCalculating, calculateNow } = useManualSimulation(() => {
    const normalizedPurchaseAmount = Number(purchaseAmount) || 0;
    const normalizedSaleAmount = Number(saleAmount) || 0;
    const parsedTaxRate = Number(taxRateInput || 0);
    const normalizedTaxRate = Number.isFinite(parsedTaxRate) ? Math.max(0, parsedTaxRate) : 0;
    const monthlyResult = normalizedSaleAmount - normalizedPurchaseAmount;
    const currentAccumulatedLoss = Math.max(0, Number(accumulatedLoss) || 0);

    if (monthlyResult < 0) {
      const additionalLoss = Math.abs(monthlyResult);
      return {
        purchaseAmount: normalizedPurchaseAmount,
        saleAmount: normalizedSaleAmount,
        accumulatedLoss: currentAccumulatedLoss,
        taxRate: normalizedTaxRate,
        monthlyResult,
        compensatedAmount: 0,
        taxableBase: 0,
        taxDue: 0,
        remainingLoss: currentAccumulatedLoss + additionalLoss,
        netResultAfterTax: monthlyResult,
        additionalLoss,
      };
    }

    const compensatedAmount = Math.min(monthlyResult, currentAccumulatedLoss);
    const taxableBase = Math.max(monthlyResult - compensatedAmount, 0);
    const taxDue = taxableBase * (normalizedTaxRate / 100);
    const remainingLoss = Math.max(currentAccumulatedLoss - compensatedAmount, 0);
    const netResultAfterTax = monthlyResult - taxDue;

    return {
      purchaseAmount: normalizedPurchaseAmount,
      saleAmount: normalizedSaleAmount,
      accumulatedLoss: currentAccumulatedLoss,
      taxRate: normalizedTaxRate,
      monthlyResult,
      compensatedAmount,
      taxableBase,
      taxDue,
      remainingLoss,
      netResultAfterTax,
      additionalLoss: 0,
    };
  }, [purchaseAmount, saleAmount, accumulatedLoss, taxRateInput], 480);

  function handleClear() {
    setPurchaseAmount(0);
    setSaleAmount(0);
    setAccumulatedLoss(0);
    setTaxRateInput("20");
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">como o imposto em FIIs funciona</h2>
          <span className="text-xs font-medium text-warning border border-warning/30 bg-warning/10 rounded-full px-2.5 py-1">
            regra geral: 20% sobre ganho de capital
          </span>
        </div>

        <div className="mb-4 rounded-lg border border-border bg-bg/40 p-3 text-sm text-muted">
          <p>base legal resumida (pessoa física, operações comuns em bolsa): ganho na venda de cotas de FII e, em regra, tributado a 20%.</p>
          <p className="mt-1">diferente de ações, não há isenção mensal de R$ 20.000 para venda de FIIs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-bg/50 p-3">
            <p className="text-xs text-accent font-semibold mb-1">passo 1</p>
            <p className="text-sm text-text">apurar lucro/prejuízo da venda</p>
          </div>
          <div className="rounded-lg border border-border bg-bg/50 p-3">
            <p className="text-xs text-accent font-semibold mb-1">passo 2</p>
            <p className="text-sm text-text">compensar prejuízo acumulado da mesma natureza</p>
          </div>
          <div className="rounded-lg border border-border bg-bg/50 p-3">
            <p className="text-xs text-accent font-semibold mb-1">passo 3</p>
            <p className="text-sm text-text">encontrar base tributável</p>
          </div>
          <div className="rounded-lg border border-border bg-bg/50 p-3">
            <p className="text-xs text-accent font-semibold mb-1">passo 4</p>
            <p className="text-sm text-text">aplicar alíquota e calcular IR</p>
          </div>
        </div>

        <p className="text-xs text-muted mt-4">
          simulação educacional: regras podem variar por tipo de operação (comum/day trade), mudanças legais e compensação entre mercados. valide com contador e legislação vigente.
        </p>
      </div>
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">parâmetros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MoneyInput
            id="purchase-amount"
            label="comprou por quanto"
            value={purchaseAmount}
            onValueChange={setPurchaseAmount}
          />

          <MoneyInput
            id="sale-amount"
            label="vendeu por quanto"
            value={saleAmount}
            onValueChange={setSaleAmount}
          />

          <MoneyInput
            id="accumulated-loss"
            label="prejuízo acumulado anterior"
            labelInfo="É o prejuízo de meses anteriores que você ainda pode usar para reduzir a base tributável de lucros futuros na mesma natureza de operação."
            value={accumulatedLoss}
            onValueChange={setAccumulatedLoss}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="tax-rate" className="text-sm text-muted">alíquota (%)</label>
            <input
              id="tax-rate"
              type="number"
              min="0"
              step="0.01"
              value={taxRateInput}
              onChange={(event) => setTaxRateInput(event.target.value)}
              className="bg-bg border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
              placeholder="20"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClear} disabled={isCalculating}>
            limpar
          </Button>
          <Button type="button" onClick={calculateNow} disabled={isCalculating}>
            {isCalculating ? "calculando..." : "calcular"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card
          title="lucro/prejuízo da venda"
          value={isCalculating ? "calculando..." : formatCurrency(simulation.monthlyResult)}
          info="resultado da venda: valor de venda menos valor de compra da operação."
        />
        <Card
          title="base tributável"
          value={isCalculating ? "calculando..." : formatCurrency(simulation.taxableBase)}
          info="lucro que sobra apos compensar prejuízo acumulado da mesma natureza, sobre o qual se aplica a alíquota."
        />
        <Card
          title="imposto devido"
          value={isCalculating ? "calculando..." : formatCurrency(simulation.taxDue)}
          info="valor de IR calculado sobre a base tributável. para FIIs, a referencia usual em operações comuns e 20%."
        />
        <Card
          title="prejuízo remanescente"
          value={isCalculating ? "calculando..." : formatCurrency(simulation.remainingLoss)}
          info="saldo de prejuízo que ainda pode ser usado em compensações futuras."
        />
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-3">resumo da compensação</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <p className="text-muted">prejuízo usado para compensar: <span className="text-text">{formatCurrency(simulation.compensatedAmount)}</span></p>
          <p className="text-muted">resultado líquido após IR: <span className="text-text">{formatCurrency(simulation.netResultAfterTax)}</span></p>
        </div>
        {simulation.monthlyResult < 0 && (
          <p className="text-warning text-sm mt-3">
            houve prejuízo no mês. novo prejuízo acumulado: {formatCurrency(simulation.remainingLoss)}.
          </p>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">detalhamento</h2>
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full">
            <thead className="bg-bg/60">
              <tr className="border-b border-border text-left">
                <th className="py-3 px-3 text-muted font-medium">item</th>
                <th className="py-3 px-3 text-muted font-medium">valor</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3">valor de compra</td>
                <td className="py-3 px-3">{formatCurrency(simulation.purchaseAmount)}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3">valor de venda</td>
                <td className="py-3 px-3">{formatCurrency(simulation.saleAmount)}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3">lucro/prejuízo da venda</td>
                <td className="py-3 px-3">{formatCurrency(simulation.monthlyResult)}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3">prejuízo acumulado anterior</td>
                <td className="py-3 px-3">{formatCurrency(simulation.accumulatedLoss)}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3">prejuízo compensado</td>
                <td className="py-3 px-3">{formatCurrency(simulation.compensatedAmount)}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3">base tributável</td>
                <td className="py-3 px-3">{formatCurrency(simulation.taxableBase)}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3">imposto ({simulation.taxRate.toFixed(2)}%)</td>
                <td className="py-3 px-3">{formatCurrency(simulation.taxDue)}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3">prejuízo remanescente</td>
                <td className="py-3 px-3">{formatCurrency(simulation.remainingLoss)}</td>
              </tr>
              <tr>
                <td className="py-3 px-3">resultado líquido após IR</td>
                <td className="py-3 px-3">{formatCurrency(simulation.netResultAfterTax)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted px-3 py-2 border-t border-border bg-bg/40">
            simulador educacional. regras fiscais podem variar por tipo de ativo/operação.
          </p>
        </div>
      </div>
    </>
  );
}

function SimuladorAportes() {
  const [selectedOption, setSelectedOption] = useState("compound-interest");

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">simulador de aportes</h1>
        <p className="text-muted">escolha o modelo de simulação; novos modos serão adicionados nesta página</p>
      </header>

      <SimulatorTypeSelector selectedOption={selectedOption} onSelectOption={setSelectedOption} />

      {selectedOption === "compound-interest" && <CompoundInterestSimulator />}
      {selectedOption === "simple-interest" && <SimpleInterestSimulator />}
      {selectedOption === "loss-compensation" && <LossCompensationSimulator />}
    </div>
  );
}

export default SimuladorAportes;
