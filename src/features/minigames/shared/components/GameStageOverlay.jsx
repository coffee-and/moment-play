import { Children, cloneElement, isValidElement, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/game-stage-responsive-actions.css';
import { useGameAudio } from '../../../../shared/audio/GameAudioContext.jsx';
import { CompletionStars } from './CompletionStars.jsx';

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

export function GameStageModal({
  celebrationStreak = 0,
  children,
  className = '',
  showCompletionStars = false,
  style,
  ...props
}) {
  return (
    <div className={joinClassNames(['game-stage-modal', className])} style={{ ...style }} {...props}>
      {showCompletionStars ? <CompletionStars streak={celebrationStreak} /> : null}
      {Children.map(children, addActionCount)}
    </div>
  );
}
