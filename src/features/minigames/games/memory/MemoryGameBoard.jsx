import { GameItemPanel } from "../../shared/components/GameItemPanel.jsx";
import { MEMORY_PHASE, MEMORY_SYMBOLS } from "./memoryGameConfig.js";

function MemorySymbol({ value }) {
  return <span className="memory-symbol" aria-hidden="true">{value}</span>;
}

function MemoryPedestal() {
  return (
    <span className="memory-sequence__platform memory-pedestal" aria-hidden="true">
      <span className="memory-pedestal__shadow" />
      <span className="memory-pedestal__body" />
      <span className="memory-pedestal__top" />
    </span>
  );
}

function StopwatchIcon() {
  return (
    <svg aria-hidden="true" className="memory-game__clock-icon" fill="none" viewBox="0 0 24 24">
      <path d="M12 8v5l3 2M9 3h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CorrectBurst() {
  return (
    <span className="memory-card__success" aria-hidden="true">
      <span className="memory-card__success-ring" />
      {Array.from({ length: 8 }, (_, index) => (
        <span className="memory-card__success-particle" key={index} style={{ "--memory-particle-index": index }} />
      ))}
      <span className="memory-card__success-label">GOOD!</span>
    </span>
  );
}

export function MemoryGameBoard({
  correctAnnouncement,
  correctFeedback,
  data,
  isStageCovered,
  isTimerUrgent,
  onChoose,
  phase,
  remainingMs,
  round,
  sequenceDensity,
  stageContentRef,
  step,
}) {
  const shouldReveal = (index) => phase === MEMORY_PHASE.PREVIEW || index < step || phase === MEMORY_PHASE.CLEARED;
  const timerText = Math.max(0, remainingMs / 1000).toFixed(2);
  const shouldShowTimer = phase === MEMORY_PHASE.PREVIEW || phase === MEMORY_PHASE.PLAYING;

  return (
    <div ref={stageContentRef} className="memory-game__stage-content" aria-hidden={isStageCovered ? "true" : undefined}>
      {phase !== MEMORY_PHASE.IDLE ? (
        <div className="memory-game__play-shell" data-memory-count={data.count} data-phase={phase}>
          <div className="memory-game__timer-row">
            {shouldShowTimer ? (
              <div
                className={`memory-game__clock${isTimerUrgent ? " is-urgent" : ""}`}
                aria-label={`남은 시간 ${timerText}초`}
              >
                <span className="memory-game__clock-body">
                  <StopwatchIcon />
                  <span>{timerText}</span>
                </span>
              </div>
            ) : null}
          </div>
          <GameItemPanel
            title={`${round} ROUND`}
            variant="problem"
            className="memory-game__problem-panel"
            ariaLabel={`${round}라운드 기억할 순서`}
          >
            <div
              className="memory-sequence"
              data-count={data.count}
              data-density={sequenceDensity}
              aria-label="기억해야 할 이모지 순서"
            >
              {data.sequence.map((item, index) => {
                const revealed = shouldReveal(index);
                return (
                  <div
                    className={`memory-sequence__item${revealed ? " is-revealed" : " is-empty"}`}
                    data-revealed={revealed ? "true" : "false"}
                    data-symbol-id={item.id}
                    key={`${round}-${item.id}-${index}`}
                    aria-label={revealed ? `${item.name}, 순서 ${index + 1}` : `${index + 1}번째 순서, 아직 맞히지 않음`}
                  >
                    <span className="memory-sequence__display">
                      {revealed ? <MemorySymbol value={item.symbol} /> : null}
                    </span>
                    <MemoryPedestal />
                  </div>
                );
              })}
            </div>
          </GameItemPanel>
          <GameItemPanel
            title="순서대로 선택하세요"
            variant="selection"
            className="memory-game__selection-panel"
            ariaLabel="선택할 이모지"
          >
            <div className="memory-card-grid">
              {MEMORY_SYMBOLS.map((symbol) => {
                const showFeedback = correctFeedback?.symbolId === symbol.id;
                return (
                  <button
                    type="button"
                    className="memory-card"
                    key={symbol.id}
                    onClick={(event) => onChoose(symbol, event)}
                    disabled={phase !== MEMORY_PHASE.PLAYING}
                    aria-label={`${symbol.name} 선택`}
                  >
                    <span className="memory-card__content">
                      <MemorySymbol value={symbol.symbol} />
                    </span>
                    {showFeedback ? <CorrectBurst key={correctFeedback.sequence} /> : null}
                  </button>
                );
              })}
            </div>
            <span className="visually-hidden" aria-live="polite">{correctAnnouncement}</span>
          </GameItemPanel>
        </div>
      ) : null}
    </div>
  );
}
