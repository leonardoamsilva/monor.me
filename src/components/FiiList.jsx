import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from './ui/Button';
import Input from './ui/Input';
import { formatCurrency } from '../utils/format';
import  useFiiSearch  from '../hooks/useFiiSearch';

function formatLastUpdateDate(value) {
  if (!value) return 'pendente';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'pendente';
  return parsed.toLocaleDateString('pt-BR');
}

function FiiList({fiis, setFiis}) {
  
  const [ticker, setTicker] = useState("");
  const [cotas, setCotas] = useState(0);
  const [precoMedio, setPrecoMedio] = useState(0);
  const [rendaMensal, setRendaMensal] = useState(0);
  const [error, setError] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [dividendYield, setDividendYield] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const tickerInputRef = useRef(null);
  const optionRefs = useRef([]);

  const { results, loading, searchTickers, getFiiDetails, clearResults } = useFiiSearch();

  async function handleSelectTicker(selectedTicker) {
    setTicker(selectedTicker ?? '');
    setHighlightedIndex(-1);
    setError("");
    clearResults();
    try {
      const details = await getFiiDetails(selectedTicker);
      if (details) {
        setPrecoMedio(details.price ?? 0);
        setDividendYield(details.dividendYield ?? 0);
      } else {
        setError("Não foi possível carregar os dados do ativo. Verifique a API/CORS.");
      }
    } catch {
      setError("Não foi possível carregar os dados do ativo. Preencha manualmente.");
    }
  }

  useEffect(() => {
    if(searchParams.get("focus") === "true") {
      tickerInputRef.current?.focus();
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const yieldAnual = (dividendYield / 12 / 100) * precoMedio * cotas;
    setRendaMensal(yieldAnual.toFixed(2));
  }, [dividendYield, precoMedio, cotas]);

  useEffect(() => {
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  function getResultSymbol(item) {
    return typeof item === 'object' ? (item.stock ?? item.symbol) : item;
  }

  function handleTickerKeyDown(e) {
    if (!results.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const selected = getResultSymbol(results[highlightedIndex]);
      handleSelectTicker(selected);
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      setHighlightedIndex(results.length - 1);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      clearResults();
      setHighlightedIndex(-1);
    }
  }

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
      setError("Ativo já existe na carteira.");
      return;
    }

    const newFii = {
      ticker: tickerCapitalized,
      cotas: Number(cotas),
      precoMedio: Number(precoMedio),
      rendaMensal: Number(rendaMensal),
      dividendYield: Number(dividendYield),
      valorAtual: editIndex !== null ? Number(fiis[editIndex]?.valorAtual ?? precoMedio) : Number(precoMedio),
      createdAt: editIndex !== null ? fiis[editIndex]?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
      lastQuoteAt: editIndex !== null ? fiis[editIndex]?.lastQuoteAt ?? null : null,
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

  const latestQuoteAt = fiis
    .map((fii) => Date.parse(String(fii.lastQuoteAt ?? '')))
    .filter((value) => Number.isFinite(value))
    .reduce((latest, current) => (current > latest ? current : latest), 0);

  return (
    <div className='bg-surface border border-border rounded-xl p-6'>
      <div className='mb-6 flex items-end justify-between gap-4'>
        <h2 className='text-xl font-semibold'>minha carteira de FIIs e FIAGROs</h2>
        <p className='text-xs text-muted'>cotações atualizadas em: {formatLastUpdateDate(latestQuoteAt)}</p>
      </div>
    {error && <p className='text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-2 mb-4'>{error}</p>}
    <form onSubmit={handleAddFii} className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
      <div className="relative">
        <Input
          ref={tickerInputRef}
          label="ticker"
          placeholder="ex: HGLG11"
          value={ticker}
          onKeyDown={handleTickerKeyDown}
          onChange={(e) => {
            const value = e.target.value;
            setTicker(value);
            setHighlightedIndex(-1);
            if (value.trim().length >= 2) searchTickers(value.trim());
            else {
              clearResults();
              setHighlightedIndex(-1);
            }
          }}
        />
        {(results.length > 0 || loading) && (
          <ul className="absolute top-full left-0 right-0 mt-1 z-10 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {loading && results.length === 0 && (
              <li className="px-4 py-2 text-muted text-sm">carregando...</li>
            )}
            {results.map((item, index) => {
              const symbol = getResultSymbol(item);
              return (
                <li key={symbol}>
                  <button
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    className={`w-full px-4 py-2 text-left text-text transition-colors ${highlightedIndex === index ? 'bg-surface-hover' : 'hover:bg-surface-hover'}`}
                    onClick={() => handleSelectTicker(symbol)}
                  >
                    {symbol}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
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
          disabled={true}
        />

        <Input
          label="dividend yield (12M) %"
          placeholder="0.00"
          type="number"
          value={dividendYield}
          onChange={(e) => yieldCalculation(e.target.value)}
        />

        <div className='md:col-span-4'>
          <Button type="submit">{editIndex !== null ? "salvar" : "adicionar ativo"}</Button>
        </div>
    </form>

      <table className='w-full'>
        <thead>
          <tr className='border-b border-border text-left'>
            <th className='pb-3 text-muted font-medium'>ativo</th>
            <th className='pb-3 text-muted font-medium'>cotas</th>
            <th className='pb-3 text-muted font-medium'>preço médio</th>
            <th className='pb-3 text-muted font-medium'>preço atual</th>
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
              <td className='py-4'>{formatCurrency(fii.valorAtual ?? fii.precoMedio)}</td>
              <td className='py-4'>{formatCurrency(fii.rendaMensal)}</td>
              <td className='py-4'>{fii.dividendYield.toFixed(2)} %</td>
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