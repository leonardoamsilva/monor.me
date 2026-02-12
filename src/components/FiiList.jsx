import { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { formatCurrency } from '../utils/format';

function FiiList({fiis, setFiis}) {
  
  const [ticker, setTicker] = useState("");
  const [cotas, setCotas] = useState(0);
  const [precoMedio, setPrecoMedio] = useState(0);
  const [rendaMensal, setRendaMensal] = useState(0);
  const [error, setError] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [dividendYield, setDividendYield] = useState(0);

  useEffect(() => {
    const yieldAnual = (dividendYield / 12 / 100) * precoMedio * cotas;
    setRendaMensal(yieldAnual.toFixed(2));
  }, [dividendYield, precoMedio, cotas]);

  function handleAddFii(e) {
    e.preventDefault();
    setError("");

    if(Number(cotas) <= 0 || Number(precoMedio) <= 0 || Number(rendaMensal) < 0) {
      setError("Cotas e preço médio devem ser maiores que zero. Renda mensal não pode ser negativa.");
      return;
    } 

    if (!ticker || cotas <= 0 || precoMedio <= 0 || rendaMensal < 0) {
      setError("Por favor, preencha todos os campos corretamente.");
      return;
    }

    const tickerCapitalized = ticker.trim().toUpperCase();

    const tickerExists = fiis.some((fii, index) => {
      if(editIndex !== null && index === editIndex) return false;
      return fii.ticker === tickerCapitalized;
    });

    if(tickerExists) {
      setError("FII já existe na carteira.");
      return;
    }

    const newFii = {
      ticker: tickerCapitalized,
      cotas: Number(cotas),
      precoMedio: Number(precoMedio),
      rendaMensal: Number(rendaMensal),
      dividendYield: Number(dividendYield)
    }

    if(editIndex !== null) {
      const newList =fiis.map((fii, index) =>
      index === editIndex ? newFii : fii
    )
    setFiis(newList);
    setEditIndex(null);
    } else {
      setFiis([...fiis, newFii]);
    }

    setTicker("");
    setCotas(0);
    setPrecoMedio(0);
    setRendaMensal(0);
    setDividendYield(0);
}

function handleRemoveFii(indexToRemove) {
  const newFiis = fiis.filter((_, index) => index !== indexToRemove);
  setFiis(newFiis);
}

function handleEditFii(index) {
  const fii = fiis[index];

  setTicker(fii.ticker);
  setCotas(fii.cotas);
  setPrecoMedio(fii.precoMedio);
  setDividendYield(fii.dividendYield);
  setEditIndex(index);
}

function yieldCalculation(yieldAnual) {
  setDividendYield(yieldAnual);

}

  return (
    <div className='bg-surface border border-border rounded-xl p-6'>
      <h2 className='text-xl font-semibold mb-6'>minha carteira de FIIs</h2>
    {error && <p className='text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-2 mb-4'>{error}</p>}
    <form onSubmit={handleAddFii} className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
      <Input
      label="ticker"
          placeholder="ex: HGLG11"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
        />
        <Input
        label="cotas"
          placeholder="0"
          type="number"
          value={cotas}
          onChange={(e) => setCotas(e.target.value)}
        />
        <Input
        label="preço médio"
          placeholder="0.00"
          type="number"
          value={precoMedio}
          onChange={(e) => setPrecoMedio(e.target.value)}
        />

        <Input
          label="dividend yield (12M) %"
          placeholder="0.00"
          type="number"
          value={dividendYield}
          onChange={(e) => yieldCalculation(e.target.value)}
        />

        <div className='md:col-span-4'>
          <Button type="submit">{editIndex !== null ? "salvar" : "adicionar FII"}</Button>
        </div>
    </form>

      <table className='w-full'>
        <thead>
          <tr className='border-b border-border text-left'>
            <th className='pb-3 text-muted font-medium'>FII</th>
            <th className='pb-3 text-muted font-medium'>cotas</th>
            <th className='pb-3 text-muted font-medium'>preço médio</th>
            <th className='pb-3 text-muted font-medium'>renda mensal</th>
            <th className='pb-3 text-muted font-medium'>dividend yield (12M)%</th>
            <th className='pb-3 text-muted font-medium'></th>
          </tr>
        </thead>
        <tbody>
          {fiis.map((fii, index) => (
            <tr key={index} className='border-b border-border/50 hover:bg-surface-hover transition-colors'>
              <td className='py-4 font-semibold'>{fii.ticker}</td>
              <td className='py-4'>{fii.cotas}</td>
              <td className='py-4'>{formatCurrency(fii.precoMedio)}</td>
              <td className='py-4'>{formatCurrency(fii.rendaMensal)}</td>
              <td className='py-4'>{fii.dividendYield} %</td>
              <td className='py-4 flex gap-2'>
                <Button onClick={() => handleEditFii(index)}>editar</Button>
                <Button onClick={() => handleRemoveFii(index)} variant="danger">remover</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default FiiList;