import { useEffect, useState } from 'react';

const SETTINGS_STORAGE_KEY = 'monor:settings';

export const DEFAULT_SETTINGS = {
  dashboardChartType: 'donut',
  dashboardChartShowLegend: true,
  dashboardChartShowLabels: true,
  incomeGoalMonthly: 0,
};

function safeParseSettings(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? safeParseSettings(stored) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  function updateSetting(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
  }

  return {
    settings,
    updateSetting,
    resetSettings,
  };
}
