import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../../shared/components/Button.jsx';
import { EditorialLabel } from '../../../../shared/components/editorial/EditorialLabel.jsx';
import { GameGuideIconButton, GameGuideModal } from './GameGuide.jsx';
import { useGameGuide } from './GameGuideContext.jsx';

function joinClassNames(values) {
  return values.filter(Boolean).join(' ');
}

function focusElement(element) {
  if (!element) return;
  element.focus({ preventScroll: true });
}

export function GameStage({
  actionLayout = 'split',
  actions,
  ariaLabel,
  children,
  className = '',
  description,
  eyebrow,
  fullscreenEnabled = false,
  sidebar,
  title,
}) {
  const rootRef = useRef(null);
  const expandButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const isExpanded = isFullscreen || isFocusMode;
  const guide = useGameGuide();

  useEffect(() => {
    function handleFullscreenChange() {
      const isCurrentFullscreen = document.fullscreenElement === rootRef.current;
      setIsFullscreen(isCurrentFullscreen);
      if (!document.fullscreenElement && !isCurrentFullscreen) {
        window.requestAnimationFrame(() => focusElement(expandButtonRef.current));
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  async function enterExpandedMode() {
    const rootElement = rootRef.current;
    if (!rootElement) return;
    previousFocusRef.current = document.activeElement;
    if (!fullscreenEnabled || !rootElement.requestFullscreen) {
      setIsFocusMode(true);
      return;
    }
    try {
      await rootElement.requestFullscreen();
      setIsFullscreen(document.fullscreenElement === rootElement);
    } catch {
      setIsFocusMode(true);
    }
  }

  async function exitExpandedMode() {
    if (document.fullscreenElement === rootRef.current) {
      try {
        await document.exitFullscreen();
      } catch {
        setIsFullscreen(false);
      }
    }
    setIsFocusMode(false);
    window.setTimeout(() => focusElement(previousFocusRef.current ?? expandButtonRef.current), 0);
  }

  function handleToggleExpanded() {
    if (isExpanded) {
      exitExpandedMode();
      return;
    }
    enterExpandedMode();
  }

  return (
    <section ref={rootRef} className={joinClassNames(['game-stage', isExpanded ? 'is-expanded' : '', isFocusMode ? 'is-focus-mode' : '', className])} aria-label={ariaLabel ?? title}>
      <div className="game-stage__inner">
        <aside className="card game-stage__side">
          <span className="board-motif" aria-hidden="true" />
          <div className="game-stage__copy">
            {eyebrow ? <EditorialLabel variant="section">{eyebrow}</EditorialLabel> : null}
            <div className="game-stage__title-row">
              <h2>{title}</h2>
              {guide ? <GameGuideIconButton label={`${title} guide`} onClick={() => setIsGuideOpen(true)} /> : null}
            </div>
            {description ? <p>{description}</p> : null}
          </div>
          <div className={joinClassNames(['game-stage__actions', `game-stage__actions--${actionLayout}`])} data-layout={actionLayout}>
            <div className="game-stage__action-slot game-stage__action-slot--primary">{actions}</div>
            <div className="game-stage__action-slot game-stage__action-slot--expand">
              {fullscreenEnabled ? (
                <Button ref={expandButtonRef} className="game-stage__expand" variant="secondary" type="button" onClick={handleToggleExpanded} aria-expanded={isExpanded} aria-label={isExpanded ? 'Exit fullscreen' : 'Expand game'}>
                  {isExpanded ? 'Exit fullscreen' : 'Expand'}
                </Button>
              ) : null}
            </div>
          </div>
          {sidebar ? <div className="game-stage__sidebar">{sidebar}</div> : null}
        </aside>
        <main className="card game-stage__play">
          <div className="game-stage__content">{children}</div>
        </main>
      </div>
      {isGuideOpen ? <GameGuideModal guide={guide} onClose={() => setIsGuideOpen(false)} /> : null}
    </section>
  );
}
