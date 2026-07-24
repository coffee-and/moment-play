import { useEffect, useRef, useState } from "react";
import { Button } from "../../../../shared/components/Button.jsx";
import {
  ClockIcon,
  CloseIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  TrophyIcon,
} from "../../../../shared/components/icons/PhosphorIcons.jsx";
import { GameIconButton } from "./GameIconButton.jsx";
import { GameGuideContent } from "./GameGuide.jsx";
import { GameStage } from "./GameStage.jsx";
import { GameStageDoodle } from "./GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "./GameStageOverlay.jsx";
import { PuzzleHintButton, PuzzleHintPanel } from "./PuzzleHintPanel.jsx";
import { getStreakCelebrationCopy, NEXT_ROUND_LABEL } from "../gameStreak.js";
import "../styles/logic-puzzle-stage.css";

function formatPuzzleTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function LogicPuzzleStage({
  children,
  completionText = "퍼즐을 완성했어요.",
  endOnSurrender = false,
  eyebrow = "LOGIC PUZZLE",
  failureText = "이번 판은 여기까지예요.",
  game,
  hint,
  completionEyebrow = "CLEAR!",
  onNextRound,
  onReset,
  onStart,
  onSurrender,
  session,
  stats = [],
}) {
  const [isSurrenderOpen, setIsSurrenderOpen] = useState(false);
  const nextRoundPendingRef = useRef(false);
  const completionCopy = getStreakCelebrationCopy(session.completionStreak);

  useEffect(() => {
    if (session.phase === "playing") nextRoundPendingRef.current = false;
  }, [session.phase]);

  function requestSurrender() {
    session.pause();
    setIsSurrenderOpen(true);
  }

  function continuePuzzle() {
    setIsSurrenderOpen(false);
    session.resume();
  }

  function confirmSurrender() {
    setIsSurrenderOpen(false);
    session.revealAnswer?.();
    onSurrender?.();
    if (endOnSurrender) session.surrender();
    else session.resume();
  }

  function startNextRound() {
    if (nextRoundPendingRef.current) return;
    nextRoundPendingRef.current = true;
    (onNextRound ?? onReset)?.();
  }

  const sidebar = (
    <div className="logic-puzzle-stage__stats">
      <div className="stat-row">
        <div className="stat">
          <div className="l"><ClockIcon />Time</div>
          <div className="v">{formatPuzzleTime(session.elapsedSeconds)}</div>
        </div>
        <div className="stat">
          <div className="l"><TrophyIcon />Best</div>
          <div className="v">{session.bestTime ? formatPuzzleTime(session.bestTime) : "--:--"}</div>
        </div>
        {stats.map((stat) => (
          <div className="stat" key={stat.label}>
            <div className="l">{stat.label}</div>
            <div className="v">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <GameStage
      actions={(
        <>
          {session.phase === "playing" ? (
            <GameIconButton label="게임 일시정지" onClick={session.pause}>
              <PauseIcon />
            </GameIconButton>
          ) : null}
          {session.phase === "paused" && !session.isExitOpen ? (
            <GameIconButton label="게임 계속하기" onClick={session.resume}>
              <PlayIcon />
            </GameIconButton>
          ) : null}
          <GameIconButton label="게임 나가기" onClick={session.requestExit}>
            <CloseIcon />
          </GameIconButton>
        </>
      )}
      ariaLabel={`${game.title} 게임`}
      className="logic-puzzle-stage"
      description={game.description}
      eyebrow={eyebrow}
      isExitConfirmationOpen={session.isExitOpen}
      onRequestExit={session.requestExit}
      phase={session.phase}
      sidebar={sidebar}
      title={game.title}
      topbarMeta={(
        <span aria-label={`경과 시간 ${formatPuzzleTime(session.elapsedSeconds)}`}>
          <ClockIcon />
          {formatPuzzleTime(session.elapsedSeconds)}
        </span>
      )}
    >
      <div className="logic-puzzle-stage__board-wrap">
        {children}
      </div>

      {session.phase !== "idle" && session.phase !== "completed" && session.phase !== "failed" && session.phase !== "surrendered" ? (
        <div className="logic-puzzle-stage__session-controls">
          {session.phase === "playing" ? <PuzzleHintButton hint={hint} /> : null}
          {onSurrender && session.phase === "playing" ? (
            <Button size="small" variant="secondary" onClick={requestSurrender}>
              포기
            </Button>
          ) : null}
          <Button size="small" variant="secondary" onClick={onReset}>
            <RestartIcon />
            새 게임
          </Button>
        </div>
      ) : null}

      {session.phase === "playing" ? <PuzzleHintPanel gameId={game.id} hint={hint} /> : null}

      {session.phase === "surrendered" ? (
        <section className="logic-puzzle-stage__answer-summary" aria-labelledby={`${game.id}-answer-title`}>
          <strong id={`${game.id}-answer-title`}>정답을 확인했어요</strong>
          <p>표시된 풀이를 천천히 살펴보세요.</p>
          <span>연속 성공 기록은 초기화됐어요.</span>
          <Button type="button" onClick={startNextRound}>{NEXT_ROUND_LABEL}</Button>
        </section>
      ) : null}

      {session.phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal
            className="game-stage-start-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${game.id}-start-title`}
          >
            <GameStageDoodle variant="start" />
            <h2 id={`${game.id}-start-title`}>{game.title}</h2>
            <GameGuideContent compact guide={game.guide ?? { description: game.howTo }} />
            <div className="game-stage-modal__actions">
              <Button autoFocus onClick={onStart}>게임 시작</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {session.phase === "completed" ? (
        <GameStageOverlay state="complete">
          <GameStageModal
            celebrationStreak={session.completionStreak}
            showCompletionStars={!session.hasRevealedAnswer}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${game.id}-complete-title`}
          >
            {!session.hasRevealedAnswer ? <GameStageDoodle variant="record" /> : null}
            <div className="game-stage-modal__eyebrow">
              {session.hasRevealedAnswer ? "PRACTICE COMPLETE" : completionEyebrow}
            </div>
            <h2 id={`${game.id}-complete-title`}>
              {session.hasRevealedAnswer ? "연습 완료" : completionCopy.title}
            </h2>
            <p>{session.hasRevealedAnswer ? "정답 보기 사용 · 연습 완료" : completionCopy.subtitle}</p>
            <p>{completionText}</p>
            <strong className="logic-puzzle-stage__result-time">{formatPuzzleTime(session.elapsedSeconds)}</strong>
            {hint?.hasUsedHint ? <p className="puzzle-hint-result-label">힌트 사용 · 연습 기록</p> : null}
            <div className="game-stage-modal__actions">
              <Button onClick={startNextRound}>{NEXT_ROUND_LABEL}</Button>
              <Button variant="secondary" onClick={session.leaveGame}>게임 목록으로</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {session.phase === "failed" ? (
        <GameStageOverlay state="failure">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby={`${game.id}-failure-title`}>
            <GameStageDoodle variant="failure" />
            <h2 id={`${game.id}-failure-title`}>다시 도전!</h2>
            <p>{failureText}</p>
            <div className="game-stage-modal__actions">
              <Button onClick={onReset}>다시 도전</Button>
              <Button variant="secondary" onClick={session.leaveGame}>게임 목록으로</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {session.phase === "paused" && !session.isExitOpen && !isSurrenderOpen ? (
        <GameStageOverlay state="paused">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby={`${game.id}-paused-title`}>
            <h2 id={`${game.id}-paused-title`}>일시정지</h2>
            <p>타이머와 보드 입력이 멈췄어요.</p>
            <div className="game-stage-modal__actions">
              <Button autoFocus onClick={session.resume}>
                <PlayIcon />
                계속하기
              </Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isSurrenderOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby={`${game.id}-surrender-title`}>
            <h2 id={`${game.id}-surrender-title`}>정말 포기할까요?</h2>
            <p>정답을 확인하면 이번 판은 완료 횟수에 포함되지 않아요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={confirmSurrender}>정답 보기</Button>
              <Button variant="secondary" onClick={continuePuzzle}>계속 풀기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {session.isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby={`${game.id}-exit-title`}>
            <h2 id={`${game.id}-exit-title`}>게임을 나갈까요?</h2>
            <p>진행 중인 퍼즐은 저장되지 않아요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={session.leaveGame}>나가기</Button>
              <Button variant="secondary" onClick={session.continueGame}>계속하기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
