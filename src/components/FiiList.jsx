import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from './ui/Button';
import Input from './ui/Input';
import LoadingModal from './ui/LoadingModal';
import { formatCurrency } from '../utils/format';
import  useFiiSearch  from '../hooks/useFiiSearch';
import { withMinDelay } from '../utils/async';

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
  const [error, setError] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [dividendYield, setDividendYield] = useState(0);
  const [tipo, setTipo] = useState('Outros');
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [removingIndex, setRemovingIndex] = useState(null);
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
        setTipo(String(details.segmentType ?? 'Outros'));
      } else {
        setTipo('Outros');
        setError("Não foi possível carregar os dados do ativo. Verifique a API/CORS.");
      }
    } catch {
      setTipo('Outros');
      setError("Não foi possível carregar os dados do ativo. Preencha manualmente.");
    }
  }

  useEffect(() => {
    if(searchParams.get("focus") === "true") {
      tickerInputRef.current?.focus();
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const rendaMensal = useMemo(() => {
    const numericDy = Number(dividendYield) || 0;
    const numericPrecoMedio = Number(precoMedio) || 0;
    const numericCotas = Number(cotas) || 0;
    return Number(((numericDy / 12 / 100) * numericPrecoMedio * numericCotas).toFixed(2));
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

  async function handleAddFii(e) {
    e.preventDefault();
    if (saving) return;
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
      tipo: String(tipo || 'Outros').trim(),
      cotas: Number(cotas),
      precoMedio: Number(precoMedio),
      rendaMensal: Number(rendaMensal),
      dividendYield: Number(dividendYield),
      valorAtual: editIndex !== null ? Number(fiis[editIndex]?.valorAtual ?? precoMedio) : Number(precoMedio),
      createdAt: editIndex !== null ? fiis[editIndex]?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
      lastQuoteAt: editIndex !== null ? fiis[editIndex]?.lastQuoteAt ?? null : null,
    }

    setSaving(true);
    try {
      await withMinDelay(async () => {
        if (editIndex !== null) {
          const newList = fiis.map((fii, index) => (index === editIndex ? newFii : fii));
          setFiis(newList);
          setEditIndex(null);
        } else {
          setFiis([...fiis, newFii]);
        }
      }, 420);
    } finally {
      setSaving(false);
    }

    setTicker("");
    setCotas(0);
    setPrecoMedio(0);
    setDividendYield(0);
    setTipo('Outros');
  }

  async function handleRemoveFii(indexToRemove) {
    if (saving || removingIndex !== null) return;
    setRemovingIndex(indexToRemove);

    try {
      await withMinDelay(async () => {
        const newFiis = fiis.filter((_, index) => index !== indexToRemove);
        setFiis(newFiis);
      }, 350);
    } finally {
      setRemovingIndex(null);
    }
  }

function handleEditFii(index) {
  const fii = fiis[index];

  setTicker(fii.ticker);
  setCotas(fii.cotas);
  setPrecoMedio(fii.precoMedio);
  setDividendYield(fii.dividendYield);
  setTipo(String(fii.tipo ?? 'Outros'));
  setEditIndex(index);
}

function yieldCalculation(yieldAnual) {
  setDividendYield(yieldAnual);

}

  const latestQuoteAt = fiis
    .map((fii) => Date.parse(String(fii.lastQuoteAt ?? '')))
    .filter((value) => Number.isFinite(value))
    .reduce((latest, current) => (current > latest ? current : latest), 0);

  const loadingModalOpen = loading || saving || removingIndex !== null;
  const loadingModalTitle = loading
    ? 'consultando ativo'
    : saving
      ? (editIndex !== null ? 'salvando alterações' : 'adicionando ativo')
      : 'removendo ativo';
  const loadingModalDescription = loading
    ? 'buscando preço, DY e tipo do ativo...'
    : saving
      ? 'atualizando sua carteira...'
      : 'atualizando sua carteira...';

  return (
    <div className='bg-surface border border-border rounded-xl p-4 sm:p-6'>
      <LoadingModal
        open={loadingModalOpen}
        title={loadingModalTitle}
        description={loadingModalDescription}
      />

      <div className='mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4'>
        <h2 className='text-xl font-semibold'>minha carteira de FIIs e FIAGROs</h2>
        <p className='text-xs text-muted'>
          {saving ? 'salvando ativo...' : removingIndex !== null ? 'removendo ativo...' : `cotações atualizadas em: ${formatLastUpdateDate(latestQuoteAt)}`}
        </p>
      </div>
    {error && <p className='text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-2 mb-4'>{error}</p>}
    <form onSubmit={handleAddFii} className='grid grid-cols-1 md:grid-cols-5 gap-3 mb-6'>
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
          disabled={saving || removingIndex !== null}
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
          disabled={saving || removingIndex !== null}
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
          disabled={saving || removingIndex !== null}
        />

        <Input
          label="tipo (ANBIMA)"
          value={tipo}
          disabled
          readOnly
        />

        <div className='md:col-span-5'>
          <Button type="submit" disabled={saving || removingIndex !== null || loading}>
            {saving ? 'processando...' : editIndex !== null ? 'salvar' : 'adicionar ativo'}
          </Button>
        </div>
    </form>

      <div className='overflow-x-auto'>
      <table className='w-full min-w-[980px]'>
        <thead>
          <tr className='border-b border-border text-left'>
            <th className='pb-3 text-muted font-medium'>ativo</th>
            <th className='pb-3 text-muted font-medium'>tipo</th>
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
              <td className='py-4 font-semibold whitespace-nowrap'>{fii.ticker}</td>
              <td className='py-4 whitespace-nowrap'>{fii.tipo ?? 'Outros'}</td>
              <td className='py-4 whitespace-nowrap'>{fii.cotas}</td>
              <td className='py-4 whitespace-nowrap'>{formatCurrency(fii.precoMedio)}</td>
              <td className='py-4 whitespace-nowrap'>{formatCurrency(fii.valorAtual ?? fii.precoMedio)}</td>
              <td className='py-4 whitespace-nowrap'>{formatCurrency(fii.rendaMensal)}</td>
              <td className='py-4 whitespace-nowrap'>{fii.dividendYield.toFixed(2)} %</td>
              <td className='py-4 flex gap-2 whitespace-nowrap'>
                <Button onClick={() => handleEditFii(index)} disabled={saving || removingIndex !== null}>editar</Button>
                <Button onClick={() => handleRemoveFii(index)} variant="danger" disabled={saving || removingIndex !== null}>
                  {removingIndex === index ? 'removendo...' : 'remover'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

export default FiiList;