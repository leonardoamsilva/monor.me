import { useEffect, useRef, useState } from 'react';

function RevealOnScroll({
  children,
  className = '',
  delay = 0,
  threshold = 0.16,
  rootMargin = '0px 0px -12% 0px',
}) {
  const elementRef = useRef(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setVisible(true);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  return (
    <div
      ref={elementRef}
      className={`reveal-on-scroll ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default RevealOnScroll;
