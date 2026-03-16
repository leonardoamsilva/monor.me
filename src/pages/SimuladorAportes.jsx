import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card";
import Button from "../components/ui/Button";
import MoneyInput from "../components/ui/MoneyInput";
import { useIsMobile } from "../hooks/useIsMobile";
import { FII_TICKERS } from "../data/fiiTickers";
import { fetchFiiDetails } from "../services/fiiApi";
import { withMinDelay } from "../utils/async";
import { formatCurrency } from "../utils/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
    id: "weighted-allocation",
    name: "alocação por percentual",
    description: "divide aporte por peso e calcula cotas",
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

function createAssetRow(id) {
  return {
    id,
    ticker: "",
    weightInput: "",
    price: 0,
    isLoadingPrice: false,
    priceError: "",
    lastFetchedTicker: "",
  };
}

function clampAssetCount(value) {
  return Math.max(1, Math.min(20, value));
}

function calculateAllocationScore({ quantities, targetAmounts, prices, totalAmount }) {
  const spentByAsset = quantities.map((quantity, index) => quantity * prices[index]);
  const spentTotal = spentByAsset.reduce((sum, value) => sum + value, 0);
  const leftover = Math.max(totalAmount - spentTotal, 0);
  const allocationError = spentByAsset.reduce(
    (sum, spentAmount, index) => sum + Math.abs(spentAmount - targetAmounts[index]),
    0
  );

  return {
    spentByAsset,
    spentTotal,
    leftover,
    score: allocationError + leftover * 0.45,
  };
}

function findOptimizedQuantities({ totalAmount, weights, prices }) {
  const targetAmounts = weights.map((weight) => totalAmount * (weight / 100));
  const initialQuantities = targetAmounts.map((targetAmount, index) => {
    const price = prices[index];
    if (price <= 0) return 0;
    return Math.max(0, Math.floor(targetAmount / price));
  });

  const activeIndexes = prices
    .map((price, index) => ({ price, index }))
    .filter((item) => item.price > 0 && weights[item.index] > 0)
    .map((item) => item.index);

  if (activeIndexes.length === 0) {
    return {
      quantities: initialQuantities,
      targetAmounts,
    };
  }

  const maxIterations = Math.min(160, activeIndexes.length * 22 + 18);
  const beamWidth = Math.min(64, activeIndexes.length * 8 + 12);
  const visited = new Set();
  let bestState = {
    quantities: initialQuantities,
    ...calculateAllocationScore({
      quantities: initialQuantities,
      targetAmounts,
      prices,
      totalAmount,
    }),
  };

  let beam = [bestState];

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const candidatesMap = new Map();

    for (const state of beam) {
      const stateKey = state.quantities.join("|");
      if (!visited.has(stateKey)) {
        visited.add(stateKey);
        candidatesMap.set(stateKey, state);
      }

      for (const index of activeIndexes) {
        const addQuantities = [...state.quantities];
        addQuantities[index] += 1;

        const addScore = calculateAllocationScore({
          quantities: addQuantities,
          targetAmounts,
          prices,
          totalAmount,
        });

        if (addScore.spentTotal <= totalAmount + 0.00001) {
          const addKey = addQuantities.join("|");
          const addState = {
            quantities: addQuantities,
            ...addScore,
          };
          const existing = candidatesMap.get(addKey);
          if (!existing || addState.score < existing.score) {
            candidatesMap.set(addKey, addState);
          }
        }

        if (state.quantities[index] > 0) {
          const removeQuantities = [...state.quantities];
          removeQuantities[index] -= 1;

          const removeKey = removeQuantities.join("|");
          const removeState = {
            quantities: removeQuantities,
            ...calculateAllocationScore({
              quantities: removeQuantities,
              targetAmounts,
              prices,
              totalAmount,
            }),
          };
          const existing = candidatesMap.get(removeKey);
          if (!existing || removeState.score < existing.score) {
            candidatesMap.set(removeKey, removeState);
          }
        }
      }
    }

    const nextBeam = [...candidatesMap.values()]
      .filter((state) => state.spentTotal <= totalAmount + 0.00001)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        if (a.leftover !== b.leftover) return a.leftover - b.leftover;
        return b.spentTotal - a.spentTotal;
      })
      .slice(0, beamWidth);

    if (nextBeam.length === 0) break;

    beam = nextBeam;

    if (beam[0].score < bestState.score) {
      bestState = beam[0];
    }
  }

  return {
    quantities: bestState.quantities,
    targetAmounts,
  };
}

function WeightedAllocationSimulator() {
  const [totalAmount, setTotalAmount] = useState(0);
  const [assetsCountInput, setAssetsCountInput] = useState("3");
  const [activeTickerRowId, setActiveTickerRowId] = useState(null);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const nextAssetIdRef = useRef(4);
  const requestTokenRef = useRef({});
  const [assets, setAssets] = useState(() => [
    createAssetRow(1),
    createAssetRow(2),
    createAssetRow(3),
  ]);

  const normalizedAssets = useMemo(
    () =>
      assets.map((asset) => {
        const parsedWeight = Number(asset.weightInput || 0);
        return {
          ...asset,
          weight: Number.isFinite(parsedWeight) ? Math.max(0, parsedWeight) : 0,
        };
      }),
    [assets]
  );

  const totalWeight = useMemo(
    () => normalizedAssets.reduce((sum, asset) => sum + asset.weight, 0),
    [normalizedAssets]
  );

  const isWeightValid = Math.abs(totalWeight - 100) < 0.0001;

  const allocationRows = useMemo(() => {
    if (!isWeightValid || totalAmount <= 0) {
      return normalizedAssets.map((asset) => ({
        ...asset,
        allocatedAmount: 0,
        sharesToBuy: 0,
        spentAmount: 0,
        remainingAmount: 0,
      }));
    }

    const weights = normalizedAssets.map((asset) => asset.weight);
    const prices = normalizedAssets.map((asset) => Number(asset.price) || 0);
    const optimized = findOptimizedQuantities({
      totalAmount,
      weights,
      prices,
    });

    return normalizedAssets.map((asset, index) => {
      const allocatedAmount = optimized.targetAmounts[index] ?? 0;
      const sharesToBuy = optimized.quantities[index] ?? 0;
      const spentAmount = sharesToBuy * prices[index];
      const remainingAmount = Math.max(allocatedAmount - spentAmount, 0);

      return {
        ...asset,
        allocatedAmount,
        sharesToBuy,
        spentAmount,
        remainingAmount,
      };
    });
  }, [isWeightValid, normalizedAssets, totalAmount]);

  const totalAllocatedByWeight = useMemo(
    () => allocationRows.reduce((sum, row) => sum + row.allocatedAmount, 0),
    [allocationRows]
  );

  const totalSpent = useMemo(
    () => allocationRows.reduce((sum, row) => sum + row.spentAmount, 0),
    [allocationRows]
  );

  const totalLeftover = useMemo(() => {
    if (!isWeightValid || totalAmount <= 0) return totalAmount;
    return Math.max(totalAmount - totalSpent, 0);
  }, [isWeightValid, totalAmount, totalSpent]);

  const allocationChartData = useMemo(
    () =>
      allocationRows
        .filter((row) => row.weight > 0)
        .map((row, index) => ({
          ticker: row.ticker || `ativo ${index + 1}`,
          alvo: Number(row.allocatedAmount.toFixed(2)),
          comprado: Number(row.spentAmount.toFixed(2)),
          sobra: Number(row.remainingAmount.toFixed(2)),
        })),
    [allocationRows]
  );

  function updateAsset(assetId, patch) {
    setAssets((currentAssets) =>
      currentAssets.map((asset) => (asset.id === assetId ? { ...asset, ...patch } : asset))
    );
  }

  function resizeAssets(targetCount) {
    const safeCount = clampAssetCount(targetCount);

    setAssets((currentAssets) => {
      if (safeCount === currentAssets.length) return currentAssets;
      if (safeCount < currentAssets.length) return currentAssets.slice(0, safeCount);

      const newAssets = [...currentAssets];
      while (newAssets.length < safeCount) {
        newAssets.push(createAssetRow(nextAssetIdRef.current));
        nextAssetIdRef.current += 1;
      }
      return newAssets;
    });

    setAssetsCountInput(String(safeCount));
  }

  useEffect(() => {
    for (const asset of assets) {
      const normalizedTicker = asset.ticker.trim().toUpperCase();
      if (!normalizedTicker) continue;
      if (!FII_TICKERS.includes(normalizedTicker)) continue;
      if (asset.lastFetchedTicker === normalizedTicker || asset.isLoadingPrice) continue;

      const requestToken = `${asset.id}-${Date.now()}-${Math.random()}`;
      requestTokenRef.current[asset.id] = requestToken;

      setAssets((currentAssets) =>
        currentAssets.map((currentAsset) =>
          currentAsset.id === asset.id
            ? {
              ...currentAsset,
              isLoadingPrice: true,
              priceError: "",
            }
            : currentAsset
        )
      );

      withMinDelay(async () => {
        const details = await fetchFiiDetails(normalizedTicker);
        return details;
      }, 350)
        .then((details) => {
          if (requestTokenRef.current[asset.id] !== requestToken) return;

          const hasValidPrice = Number(details?.price ?? 0) > 0;

          setAssets((currentAssets) =>
            currentAssets.map((currentAsset) =>
              currentAsset.id === asset.id
                ? {
                  ...currentAsset,
                  price: hasValidPrice ? Number(details.price) : 0,
                  isLoadingPrice: false,
                  priceError: hasValidPrice ? "" : "preço indisponível para este ticker",
                  lastFetchedTicker: normalizedTicker,
                }
                : currentAsset
            )
          );
        })
        .catch(() => {
          if (requestTokenRef.current[asset.id] !== requestToken) return;

          setAssets((currentAssets) =>
            currentAssets.map((currentAsset) =>
              currentAsset.id === asset.id
                ? {
                  ...currentAsset,
                  price: 0,
                  isLoadingPrice: false,
                  priceError: "não foi possível carregar o preço",
                  lastFetchedTicker: normalizedTicker,
                }
                : currentAsset
            )
          );
        });
    }
  }, [assets]);

  function handleClear() {
    setTotalAmount(0);
    setAssetsCountInput("3");
    nextAssetIdRef.current = 4;
    requestTokenRef.current = {};
    setActiveTickerRowId(null);
    setHighlightedSuggestionIndex(-1);
    setAssets([createAssetRow(1), createAssetRow(2), createAssetRow(3)]);
  }

  function handleAssetsCountInput(nextValue) {
    setAssetsCountInput(nextValue);

    if (nextValue === "") return;

    const parsedValue = Number(nextValue || 0);
    if (!Number.isFinite(parsedValue)) return;

    const normalizedCount = clampAssetCount(Math.round(parsedValue));
    resizeAssets(normalizedCount);
  }

  function handleAssetsCountBlur() {
    if (assetsCountInput === "") {
      setAssetsCountInput(String(assets.length));
      return;
    }

    const parsedValue = Number(assetsCountInput);
    if (!Number.isFinite(parsedValue)) {
      setAssetsCountInput(String(assets.length));
      return;
    }

    const normalizedCount = clampAssetCount(Math.round(parsedValue));
    resizeAssets(normalizedCount);
  }

  function findTickerSuggestions(query) {
    const normalizedQuery = query.trim().toUpperCase();
    if (normalizedQuery.length < 2) return [];
    return FII_TICKERS.filter((ticker) => ticker.includes(normalizedQuery)).slice(0, 20);
  }

  function handleSelectTicker(assetId, selectedTicker) {
    const normalizedTicker = String(selectedTicker ?? "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .slice(0, 12);

    updateAsset(assetId, {
      ticker: normalizedTicker,
      price: 0,
      priceError: "",
      lastFetchedTicker: "",
    });

    setActiveTickerRowId(null);
    setHighlightedSuggestionIndex(-1);
  }

  function handleTickerKeyDown(event, assetId, suggestions) {
    if (!suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveTickerRowId(assetId);
      setHighlightedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveTickerRowId(assetId);
      setHighlightedSuggestionIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter" && highlightedSuggestionIndex >= 0) {
      event.preventDefault();
      handleSelectTicker(assetId, suggestions[highlightedSuggestionIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setActiveTickerRowId(null);
      setHighlightedSuggestionIndex(-1);
    }
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">parâmetros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoneyInput
            id="weighted-total-amount"
            label="valor total para investir"
            value={totalAmount}
            onValueChange={setTotalAmount}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="weighted-assets-count" className="text-sm text-muted">quantidade de ativos</label>
            <input
              id="weighted-assets-count"
              type="number"
              min="1"
              max="20"
              step="1"
              value={assetsCountInput}
              onChange={(event) => handleAssetsCountInput(event.target.value)}
              onBlur={handleAssetsCountBlur}
              className="bg-bg border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
              placeholder="3"
            />
            <p className="text-xs text-muted">mínimo 1 e máximo 20 ativos.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg/35 px-4 py-3">
          <div className="text-sm">
            <p className="text-muted">soma dos percentuais</p>
            <p className={`font-semibold ${isWeightValid ? "text-success" : "text-warning"}`}>
              {totalWeight.toFixed(2)}%
            </p>
          </div>
          <div className="text-xs text-muted">
            {isWeightValid
              ? "percentuais fechados em 100%. pronto para calcular cotas."
              : "ajuste os percentuais para fechar exatamente 100%."}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClear}>
            limpar
          </Button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">ativos e pesos</h2>

        <div className="space-y-3">
          {assets.map((asset, index) => {
            const suggestions = findTickerSuggestions(asset.ticker);
            const normalizedTicker = asset.ticker.trim().toUpperCase();
            const hasTypedTicker = normalizedTicker.length > 0;
            const isKnownTicker = FII_TICKERS.includes(normalizedTicker);
            const showSuggestions = activeTickerRowId === asset.id && suggestions.length > 0;

            return (
              <div key={asset.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-lg border border-border p-3 bg-bg/35">
                <div className="md:col-span-1 flex items-center text-xs text-muted">
                  ativo {index + 1}
                </div>

                <div className="md:col-span-4 flex flex-col gap-1">
                  <label htmlFor={`weighted-ticker-${asset.id}`} className="text-sm text-muted">ticker</label>
                  <div className="relative">
                    <input
                      id={`weighted-ticker-${asset.id}`}
                      value={asset.ticker}
                      onFocus={() => {
                        setActiveTickerRowId(asset.id);
                        setHighlightedSuggestionIndex(-1);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setActiveTickerRowId((current) => (current === asset.id ? null : current));
                          setHighlightedSuggestionIndex(-1);
                        }, 120);
                      }}
                      onKeyDown={(event) => handleTickerKeyDown(event, asset.id, suggestions)}
                      onChange={(event) => {
                        const nextTicker = event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 12);
                        updateAsset(asset.id, {
                          ticker: nextTicker,
                          price: 0,
                          priceError: "",
                          lastFetchedTicker: "",
                        });
                        setActiveTickerRowId(asset.id);
                        setHighlightedSuggestionIndex(-1);
                      }}
                      className="bg-bg border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors w-full"
                      placeholder="ex: HGLG11"
                    />
                    {showSuggestions && (
                      <ul className="absolute top-full left-0 right-0 mt-1 z-10 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((ticker, suggestionIndex) => (
                          <li key={ticker}>
                            <button
                              type="button"
                              className={`w-full px-4 py-2 text-left text-text transition-colors ${
                                highlightedSuggestionIndex === suggestionIndex
                                  ? "bg-surface-hover"
                                  : "hover:bg-surface-hover"
                              }`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectTicker(asset.id, ticker)}
                            >
                              {ticker}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3 flex flex-col gap-1">
                  <label htmlFor={`weighted-percentage-${asset.id}`} className="text-sm text-muted">percentual (%)</label>
                  <input
                    id={`weighted-percentage-${asset.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={asset.weightInput}
                    onChange={(event) => updateAsset(asset.id, { weightInput: event.target.value })}
                    className="bg-bg border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
                    placeholder="0"
                  />
                </div>

                <div className="md:col-span-4 flex flex-col gap-1">
                  <label className="text-sm text-muted">preço atual</label>
                  <div className="bg-bg border border-border rounded-lg px-4 py-2 text-text min-h-[42px] flex items-center justify-between">
                    <span>
                      {asset.isLoadingPrice
                        ? "carregando..."
                        : asset.price > 0
                          ? formatCurrency(asset.price)
                          : "--"}
                    </span>
                    {asset.priceError && <span className="text-warning text-xs">{asset.priceError}</span>}
                  </div>
                  {hasTypedTicker && !isKnownTicker && (
                    <p className="text-xs text-warning">ticker não encontrado na base local.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted mt-4">
          referência de preço: cotação atual retornada pela API no momento da consulta ({new Date().toLocaleDateString("pt-BR")}).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card
          title="total para investir"
          value={formatCurrency(totalAmount)}
          info="valor base informado para distribuir entre os ativos escolhidos."
        />
        <Card
          title="alocado por peso"
          value={formatCurrency(totalAllocatedByWeight)}
          info="soma da verba teórica por percentual antes de arredondar para cotas inteiras."
        />
        <Card
          title="valor em cotas"
          value={formatCurrency(totalSpent)}
          info="quanto realmente será investido após calcular quantidade inteira de cotas."
        />
        <Card
          title="saldo restante"
          value={formatCurrency(totalLeftover)}
          info="valor que sobra por não ser possível comprar frações de cota."
        />
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">resultado por ativo</h2>

        {!isWeightValid ? (
          <p className="text-sm text-warning">os percentuais precisam somar 100% para liberar o cálculo completo.</p>
        ) : totalAmount <= 0 ? (
          <p className="text-sm text-muted">informe um valor total para investir e selecione os tickers.</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full">
              <thead className="bg-bg/60">
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-3 text-muted font-medium">ticker</th>
                  <th className="py-3 px-3 text-muted font-medium">peso</th>
                  <th className="py-3 px-3 text-muted font-medium">preço</th>
                  <th className="py-3 px-3 text-muted font-medium">verba</th>
                  <th className="py-3 px-3 text-muted font-medium">cotas</th>
                  <th className="py-3 px-3 text-muted font-medium">gasto</th>
                  <th className="py-3 px-3 text-muted font-medium">sobra</th>
                </tr>
              </thead>
              <tbody>
                {allocationRows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 last:border-b-0 hover:bg-bg/30 transition-colors">
                    <td className="py-3 px-3">{row.ticker || "--"}</td>
                    <td className="py-3 px-3">{row.weight.toFixed(2)}%</td>
                    <td className="py-3 px-3">{row.price > 0 ? formatCurrency(row.price) : "--"}</td>
                    <td className="py-3 px-3">{formatCurrency(row.allocatedAmount)}</td>
                    <td className="py-3 px-3">{row.sharesToBuy}</td>
                    <td className="py-3 px-3">{formatCurrency(row.spentAmount)}</td>
                    <td className="py-3 px-3">{formatCurrency(row.remainingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted px-3 py-2 border-t border-border bg-bg/40">
              cálculo otimizado com cotas inteiras para aproximar os pesos e reduzir sobra, sem ultrapassar o valor total.
            </p>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">gráfico de alocação</h2>
        {allocationChartData.length === 0 ? (
          <p className="text-sm text-muted">preencha os ativos e percentuais para visualizar o gráfico.</p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allocationChartData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="ticker" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                  wrapperStyle={{ outline: "none" }}
                />
                <Legend />
                <Bar dataKey="alvo" name="alvo por peso" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="comprado" name="comprado" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="sobra" name="sobra" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
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
      {selectedOption === "weighted-allocation" && <WeightedAllocationSimulator />}
    </div>
  );
}

export default SimuladorAportes;
