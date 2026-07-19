import { Children, cloneElement, isValidElement, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/game-stage-responsive-actions.css';
import { useGameAudio } from '../../../../shared/audio/GameAudioContext.jsx';

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

function ModalCatDecoration() {
  return (
    <div className="game-stage-modal__sky" aria-hidden="true">
      <svg className="game-stage-modal__cat" viewBox="0 0 160 150">
        <path d="M34 138c-11-18-14-39-8-62 5-20 17-33 34-40l-3-26 21 17c6-1 12-1 18 0l20-17-2 27c14 8 24 22 26 39 3 25-2 46-12 61H34Z" />
        <path d="M42 119c-18 7-36 2-41-13-5-13 1-28 13-31 8-2 15 2 16 9 1 6-4 11-10 9 0 8 7 13 17 10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="11" />
        <circle cx="76" cy="53" r="3" fill="var(--text)" />
        <circle cx="96" cy="53" r="3" fill="var(--text)" />
        <path className="game-stage-modal__cat-sparkle" d="M130 26c2 9 6 13 15 15-9 2-13 6-15 15-2-9-6-13-15-15 9-2 13-6 15-15Z" />
      </svg>
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
  const { popDucking, pushDucking } = useGameAudio();
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    pushDucking();
    return () => popDucking();
  }, [popDucking, pushDucking]);

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
    document.body,
  );
}

export function GameStageModal({ children, className = '', style, ...props }) {
  return (
    <div className={joinClassNames(['game-stage-modal', className])} style={{ ...style }} {...props}>
      <ModalCatDecoration />
      {Children.map(children, addActionCount)}
    </div>
  );
}
