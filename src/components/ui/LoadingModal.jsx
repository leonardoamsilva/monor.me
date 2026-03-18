import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function LoadingModal({ open, title = 'carregando', description = 'aguarde um instante...' }) {
  const [shouldRender, setShouldRender] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      const frameId = window.requestAnimationFrame(() => {
        setShouldRender(true);
        setVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    const closeFrameId = window.requestAnimationFrame(() => {
      setVisible(false);
    });
    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
    }, 180);

    return () => {
      window.cancelAnimationFrame(closeFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [open]);

  if (!shouldRender) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[70] flex items-center justify-center px-4 ${visible ? 'loading-modal--visible' : ''}`}>
      <div className="loading-modal__backdrop absolute inset-0 bg-black/60 backdrop-blur-[1px]" aria-hidden="true" />

      <div
        role="status"
        aria-live="polite"
        className="loading-modal__panel relative z-10 w-full max-w-sm rounded-xl border border-border bg-surface px-5 py-4 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-accent/35 border-t-accent" />
          <div>
            <p className="text-sm font-semibold text-text">{title}</p>
            <p className="loading-modal__description text-xs text-muted">{description}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LoadingModal;
