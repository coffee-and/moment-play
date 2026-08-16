import { Children, cloneElement, isValidElement, useEffect } from 'react';
import styles from './GameStage.module.css';
import { useGameAudio } from '../../../../shared/audio/GameAudioContext.jsx';
import { ModalLayer } from '../../../../shared/overlays/ModalLayer.jsx';
import { CompletionStars } from './CompletionStars.jsx';
import { GameCelebrationProvider } from './GameCelebration.jsx';

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
  const { popDucking, pushDucking } = useGameAudio();

  useEffect(() => {
    pushDucking();
    return () => popDucking();
  }, [popDucking, pushDucking]);

  return (
    <ModalLayer
      className={joinClassNames([styles.overlay, className])}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
      focusKey={state}
      onClose={onClose}
      data-game-stage-overlay=""
      data-state={state}
      {...props}
    >
      {children}
    </ModalLayer>
  );
}

export function GameStageModal({
  celebrationStreak = 0,
  children,
  className = '',
  showCompletionStars = false,
  showCelebration = showCompletionStars,
  tabIndex = -1,
  ...props
}) {
  return (
    <div
      className={joinClassNames([styles.modal, className])}
      data-game-stage-modal=""
      data-has-celebration={showCelebration ? 'true' : undefined}
      tabIndex={tabIndex}
      {...props}
    >
      {showCompletionStars ? <CompletionStars streak={celebrationStreak} /> : null}
      <GameCelebrationProvider enabled={showCelebration}>
        {Children.map(children, addActionCount)}
      </GameCelebrationProvider>
    </div>
  );
}
