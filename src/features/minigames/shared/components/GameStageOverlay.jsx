import { Children, cloneElement, isValidElement, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/game-stage-responsive-actions.css';

function joinClassNames(values) {
  return values.filter(Boolean).join(' ');
}

function addActionCount(child) {
  if (!isValidElement(child)) return child;
  const classNames = String(child.props.className ?? '').split(/\s+/);
  if (!classNames.includes('game-stage-modal__actions')) return child;
  return cloneElement(child, {
    'data-action-count': Children.toArray(child.props.children).length,
  });
}

// Theme-aware ambient decoration shared by every game's result/status modal
// (clouds + a small sun accent by day, stars + a small crescent moon by
// night). Both layers are always in the DOM; CSS toggles which one is
// visible for the active [data-theme] (same approach as SkyDecoration.jsx),
// so this stays a plain, context-free markup fragment - no theme lookup
// needed here, and no ripple onto every game's tests. Purely decorative and
// non-interactive; layered behind the modal's real content via CSS (see
// .game-stage-modal__sky* in styles.css).
function ModalSkyDecoration() {
  return (
    <div className="game-stage-modal__sky" aria-hidden="true">
      <div className="game-stage-modal__sky-day">
        <span className="game-stage-modal__sky-sun" style={{ top: '10%', right: '14%', width: 24, height: 24 }} />
        <span className="game-stage-modal__sky-cloud" style={{ top: '18%', left: '10%', width: 66 }} />
      </div>
      <div className="game-stage-modal__sky-night">
        <span className="game-stage-modal__sky-moon" style={{ top: '12%', right: '14%', width: 24, height: 24 }}>
          <svg viewBox="0 0 32 32">
            <path d="M23.5 19.2A9.5 9.5 0 1 1 12.8 4a7.5 7.5 0 0 0 10.7 15.2Z" fill="currentColor" />
          </svg>
        </span>
        <svg
          className="game-stage-modal__sky-star game-stage-modal__sky-star--sparkle"
          style={{ top: '16%', left: '18%', width: 'var(--star-size-sm)', height: 'var(--star-size-sm)' }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 1.5c.9 5.8 3.4 8.3 9 9-5.6.7-8.1 3.2-9 9-.9-5.8-3.4-8.3-9-9 5.6-.7 8.1-3.2 9-9Z" />
        </svg>
        <span className="game-stage-modal__sky-star game-stage-modal__sky-star--dot" style={{ top: '32%', left: '76%', width: 'var(--dot-size-sm)', height: 'var(--dot-size-sm)' }} />
        <span className="game-stage-modal__sky-star game-stage-modal__sky-star--dot" style={{ top: '62%', left: '12%', width: 'var(--dot-size-md)', height: 'var(--dot-size-md)' }} />
      </div>
    </div>
  );
}

export function GameStageOverlay({
  children,
  className = '',
  closeOnBackdrop = false,
  closeOnEscape = false,
  onClose,
  state,
  ...props
}) {
  const overlayRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTarget = overlayRef.current?.querySelector('[autofocus], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])');
    focusTarget?.focus({ preventScroll: true });

    function handleKeyDown(event) {
      if (event.key === 'Escape' && closeOnEscape) onCloseRef.current?.();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [closeOnEscape]);

  return createPortal(
    <div
      ref={overlayRef}
      className={joinClassNames(['game-stage-overlay', className])}
      data-state={state}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onCloseRef.current?.();
      }}
      {...props}
    >
      {children}
    </div>,
    document.fullscreenElement ?? document.body,
  );
}

export function GameStageModal({ children, className = '', style, ...props }) {
  return (
    <div className={joinClassNames(['game-stage-modal', className])} style={{ ...style }} {...props}>
      <ModalSkyDecoration />
      {Children.map(children, addActionCount)}
    </div>
  );
}
