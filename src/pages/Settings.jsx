import { useSettings } from "../hooks/useSettings";
import MoneyInput from "../components/ui/MoneyInput";

const CHART_OPTIONS = [
  { value: 'donut', label: 'rosca' },
  { value: 'pie', label: 'pizza' },
  { value: 'bar', label: 'barras' },
];

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-surface-hover transition-colors text-left cursor-pointer"
    >
      <div>
        <p className="text-sm text-text font-medium">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </span>
    </button>
  );
}

function Settings() {
  const { settings, updateSetting, resetSettings } = useSettings();

  function handleIncomeGoalChange(value) {
    updateSetting('incomeGoalMonthly', value);
  }

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">configurações</h1>
        <p className="text-muted">personalize sua experiência</p>
      </header>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text">dashboard</h2>
          <p className="text-sm text-muted">defina como o grafico de alocacao deve ser exibido</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted">tipo de grafico</p>
          <div className="inline-flex w-full md:w-auto rounded-lg border border-border bg-bg p-1">
            {CHART_OPTIONS.map((option) => {
              const isActive = settings.dashboardChartType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateSetting('dashboardChartType', option.value)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${isActive ? 'bg-accent text-white' : 'text-muted hover:text-text hover:bg-surface-hover'}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Toggle
            checked={Boolean(settings.dashboardChartShowLegend)}
            onChange={(value) => updateSetting('dashboardChartShowLegend', value)}
            label="mostrar legenda"
            description="exibe os tickers ao lado do grafico"
          />
          <Toggle
            checked={Boolean(settings.dashboardChartShowLabels)}
            onChange={(value) => updateSetting('dashboardChartShowLabels', value)}
            label="mostrar porcentagens"
            description="mostra os percentuais no grafico e na legenda"
          />
        </div>

        <div className="pt-2 border-t border-border/60 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-text">meta de renda mensal</h2>
            <p className="text-sm text-muted">defina quanto deseja receber por mes em proventos</p>
          </div>

          <div className="max-w-sm">
            <MoneyInput
              id="income-goal"
              label="valor alvo mensal (R$)"
              value={Number(settings.incomeGoalMonthly ?? 0)}
              onValueChange={handleIncomeGoalChange}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 flex justify-end">
          <button
            type="button"
            onClick={resetSettings}
            className="px-3 py-1.5 text-sm rounded-md border border-border text-muted cursor-pointer hover:text-text hover:bg-surface-hover hover:border-accent/50 transition-colors"
          >
            restaurar padrão
          </button>
        </div>
      </div>

    </div>
  )
}

export default Settings;