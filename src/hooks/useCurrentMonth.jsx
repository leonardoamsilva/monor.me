import { useEffect, useState } from 'react';
import { getCurrentMonthString } from '../services/dividendsApi';

// Keeps the month string (YYYY-MM) updated without requiring a page reload.
export function useCurrentMonth() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthString());

  useEffect(() => {
    const intervalId = setInterval(() => {
      const next = getCurrentMonthString();
      setCurrentMonth((prev) => (prev === next ? prev : next));
    }, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  return currentMonth;
}
