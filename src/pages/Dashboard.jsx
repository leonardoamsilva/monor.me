import { useState } from "react";
import Card from "../components/Card";
import { useFiis } from "../hooks/useFiis";
import AllocationChart from "../components/AllocationChart";

function Dashboard() {
  const { fiis } = useFiis();

  const totalInvested = fiis.reduce((total, fii) => total + fii.cotas * fii.precoMedio, 0);
  const monthlyIncome = fiis.reduce((total, fii) => total + Number(fii.rendaMensal), 0);
  const yieldMonthly = totalInvested > 0 ? (monthlyIncome / totalInvested) * 100 : 0;

  const totalFiis = fiis.length;
  const totalQuotas = fiis.reduce((total, fii) => total + fii.cotas, 0);
  const yearlyIncome = monthlyIncome * 12;

  const higherPosition = fiis.length > 0 ? fiis.reduce((bigger, fii) => {
    const value = fii.cotas * fii.precoMedio;
    return value > bigger.value ? { ticker: fii.ticker, value } : bigger;
  }, { ticker: "", value: 0 }) : null;

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">dashboard</h1>
        <p className="text-muted">bem-vindo ao monor.me</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card title="total investido" value={`R$ ${totalInvested.toFixed(2)}`} />
        <Card title="renda mensal" value={`R$ ${monthlyIncome.toFixed(2)}`} />
        <Card title="yield médio" value={`${yieldMonthly.toFixed(2)}%`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
        <Card title="total de fiis" value={totalFiis} />
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