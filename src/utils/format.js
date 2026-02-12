export function formatCurrency(value) {
  const coin = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return coin
}