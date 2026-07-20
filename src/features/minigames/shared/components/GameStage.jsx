import { useEffect, useRef, useState } from 'react';
import { EditorialLabel } from '../../../../shared/components/editorial/EditorialLabel.jsx';
import { GameFeedbackEffect } from '../../../../shared/feedback/GameFeedbackEffect.jsx';
import { useGameFeedback } from '../../../../shared/feedback/GameFeedbackContext.jsx';
import { GameGuideIconButton, GameGuideModal } from './GameGuide.jsx';
import { useGameGuide } from './GameGuideContext.jsx';
import { SoundToggle } from '../../../../shared/audio/SoundToggle.jsx';
import '../styles/game-stage-responsive-actions.css';

function joinClassNames(values) {
  return values.filter(Boolean).join(' ');
}

export function GameStage({
  actions,
  ariaLabel,
  children,
  className = '',
  description,
  eyebrow,
  sidebar,
  title,
}) {
  const rootRef = useRef(null);
  const touchTimerRef = useRef(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const guide = useGameGuide();
  const { feedback } = useGameFeedback();

  function handleTouchFeedback(event) {
    if (event.button != null && event.button !== 0) return;
    if (event.target.closest?.('[role="application"]')) return;
    const rootElement = rootRef.current;
    if (!rootElement) return;
    const bounds = rootElement.getBoundingClientRect();
    rootElement.style.setProperty('--game-touch-x', `${event.clientX - bounds.left}px`);
    rootElement.style.setProperty('--game-touch-y', `${event.clientY - bounds.top}px`);
    rootElement.classList.remove('has-touch-feedback');
    void rootElement.offsetWidth;
    rootElement.classList.add('has-touch-feedback');
    window.clearTimeout(touchTimerRef.current);
    touchTimerRef.current = window.setTimeout(() => {
      rootElement.classList.remove('has-touch-feedback');
    }, 420);
  }

  useEffect(() => () => window.clearTimeout(touchTimerRef.current), []);

  return (
    <section ref={rootRef} onPointerDownCapture={handleTouchFeedback} className={joinClassNames(['game-stage', className])} aria-label={ariaLabel ?? title}>
      <header className="game-stage__topbar">
        <div className="game-stage__topbar-title">
          <strong>{title}</strong>
          {eyebrow ? <span>{eyebrow}</span> : null}
        </div>
        <div className="game-stage__topbar-actions">
          {actions ? <div className="game-stage__topbar-game-actions">{actions}</div> : null}
          {guide ? <GameGuideIconButton label={`${title} 게임 설명`} onClick={() => setIsGuideOpen(true)} /> : null}
          <SoundToggle compact />
        </div>
      </header>
      <div className="game-stage__inner">
        <aside className="card game-stage__side">
          <span className="board-motif" aria-hidden="true" />
          <div className="game-stage__copy">
            {eyebrow ? <EditorialLabel variant="section">{eyebrow}</EditorialLabel> : null}
            <div className="game-stage__title-row">
              <h2>{title}</h2>
            </div>
            {description ? <p>{description}</p> : null}
          </div>
          {sidebar ? <div className="game-stage__sidebar">{sidebar}</div> : null}
        </aside>
        <main className="card game-stage__play">
          <div className="game-stage__content">{children}</div>
        </main>
      </div>
      <GameFeedbackEffect feedback={feedback} />
      {isGuideOpen ? <GameGuideModal guide={guide} onClose={() => setIsGuideOpen(false)} /> : null}
    </section>
  );
}
