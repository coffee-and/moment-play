import { useEffect, useRef, useState } from 'react';
import { GameGuideIconButton, GameGuideModal } from './GameGuide.jsx';
import { useGameGuide } from './GameGuideContext.jsx';
import { SoundToggle } from '../../../../shared/audio/SoundToggle.jsx';
import styles from './GameStage.module.css';

function joinClassNames(values) {
  return values.filter(Boolean).join(' ');
}

export function GameStage({
  actions,
  ariaLabel,
  children,
  className = '',
  eyebrow,
  isPaused = false,
  phase,
  sidebar,
  title,
  topbarMeta,
}) {
  const rootRef = useRef(null);
  const touchTimerRef = useRef(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const guide = useGameGuide();

  function handleTouchFeedback(event) {
    if (event.button != null && event.button !== 0) return;
    const interactiveTarget = event.target.closest?.('button:not(:disabled), [role="button"], [role="gridcell"], [role="application"]');
    if (!interactiveTarget) return;
    const rootElement = rootRef.current;
    if (!rootElement) return;
    const bounds = rootElement.getBoundingClientRect();
    rootElement.style.setProperty('--game-touch-x', `${event.clientX - bounds.left}px`);
    rootElement.style.setProperty('--game-touch-y', `${event.clientY - bounds.top}px`);
    rootElement.removeAttribute('data-touch-feedback');
    void rootElement.offsetWidth;
    rootElement.setAttribute('data-touch-feedback', 'true');
    window.clearTimeout(touchTimerRef.current);
    touchTimerRef.current = window.setTimeout(() => {
      rootElement.removeAttribute('data-touch-feedback');
    }, 240);
  }

  useEffect(() => () => window.clearTimeout(touchTimerRef.current), []);

  return (
    <section
      ref={rootRef}
      onPointerDownCapture={handleTouchFeedback}
      className={joinClassNames([styles.root, className])}
      aria-label={ariaLabel ?? title}
      data-game-stage=""
      data-paused={isPaused ? "" : undefined}
      data-phase={phase}
    >
      <header className={styles.topbar} data-stage-slot="topbar">
        <div className={styles.topbarTitle} data-stage-slot="topbar-title">
          <strong>{title}</strong>
          {eyebrow ? <span>{eyebrow}</span> : null}
          {topbarMeta ? <div className={styles.topbarMeta}>{topbarMeta}</div> : null}
        </div>
        <div className={styles.topbarActions} data-stage-slot="topbar-actions">
          {guide ? <GameGuideIconButton label={`${title} 게임 설명`} onClick={() => setIsGuideOpen(true)} /> : null}
          <SoundToggle compact />
          {actions ? <div className={styles.topbarGameActions} data-stage-slot="game-actions">{actions}</div> : null}
        </div>
      </header>
      <div className={styles.inner} data-stage-slot="inner">
        {sidebar ? (
          <aside className={styles.side} data-stage-slot="side">
            <div className={styles.sidebar} data-stage-slot="sidebar">{sidebar}</div>
          </aside>
        ) : null}
        <main className={styles.play} data-stage-slot="play">
          <div className={styles.content} data-stage-slot="content">{children}</div>
        </main>
      </div>
      {isGuideOpen ? <GameGuideModal guide={guide} onClose={() => setIsGuideOpen(false)} /> : null}
    </section>
  );
}
