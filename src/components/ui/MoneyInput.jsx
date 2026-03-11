import { forwardRef } from "react";

function formatCurrencyInput(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrencyInput(value) {
  const onlyDigits = value.replace(/\D/g, '');
  if (!onlyDigits) return 0;
  return Number(onlyDigits) / 100;
}

const MoneyInput = forwardRef(function MoneyInput(
  { label, id, value = 0, onValueChange, placeholder = "R$ 0,00", ...props },
  ref
) {
  function handleChange(event) {
    const parsedValue = parseCurrencyInput(event.target.value);
    onValueChange?.(parsedValue);
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        value={formatCurrencyInput(Number(value) || 0)}
        onChange={handleChange}
        className="bg-bg border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
});

export default MoneyInput;
