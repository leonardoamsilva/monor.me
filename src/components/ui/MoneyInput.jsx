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
  { label, labelInfo, id, value = 0, onValueChange, placeholder = "R$ 0,00", ...props },
  ref
) {
  function handleChange(event) {
    const parsedValue = parseCurrencyInput(event.target.value);
    onValueChange?.(parsedValue);
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="text-sm text-muted">
            {label}
          </label>
          {labelInfo && (
            <span className="relative group inline-flex">
              <button
                type="button"
                className="w-4 h-4 rounded-full border border-border text-xs text-muted cursor-pointer transition-all duration-200 ease-out hover:text-text hover:border-accent hover:scale-110 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
                aria-label="informacao adicional"
              >
                i
              </button>
              <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 w-72 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 z-20">
                {labelInfo}
              </span>
            </span>
          )}
        </div>
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
