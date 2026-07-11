import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

function joinClassNames(values) {
  return values.filter(Boolean).join(' ');
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
      {children}
    </div>
  );
}
