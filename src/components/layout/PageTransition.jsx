import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const EXIT_DURATION_MS = 220;
const ROUTE_ORDER = ['/app', '/app/carteira', '/app/proventos', '/app/simulador-aportes', '/app/settings'];

function normalizePath(pathname) {
  const raw = String(pathname ?? '').trim();
  if (!raw || raw === '/') return '/';
  return raw.replace(/\/+$/, '');
}

function getDirection(fromPath, toPath) {
  const from = normalizePath(fromPath);
  const to = normalizePath(toPath);

  if (from === to) return 'neutral';

  const fromIndex = ROUTE_ORDER.indexOf(from);
  const toIndex = ROUTE_ORDER.indexOf(to);

  if (fromIndex === -1 || toIndex === -1) {
    return 'forward';
  }

  return toIndex > fromIndex ? 'forward' : 'backward';
}

function PageTransition({ children }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState('page-transition-enter');
  const [direction, setDirection] = useState('neutral');

  useEffect(() => {
    const hasChanged =
      location.pathname !== displayLocation.pathname ||
      location.search !== displayLocation.search ||
      location.hash !== displayLocation.hash;

    if (!hasChanged) return;

    const frameId = window.requestAnimationFrame(() => {
      setDirection(getDirection(displayLocation.pathname, location.pathname));
      setStage('page-transition-exit');
    });

    const timeoutId = window.setTimeout(() => {
      setDisplayLocation(location);
      setStage('page-transition-enter');
    }, EXIT_DURATION_MS);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [displayLocation.hash, displayLocation.pathname, displayLocation.search, location]);

  return (
    <div className={`page-transition-shell ${stage} page-transition-${direction}`}>
      {children(displayLocation)}
    </div>
  );
}

export default PageTransition;
