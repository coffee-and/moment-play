import { useEffect, useRef, useState } from "react";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { LogicPuzzleStage } from "../../shared/components/LogicPuzzleStage.jsx";
import { GameActionFeedback } from "../../shared/components/GameActionFeedback.jsx";
import { usePuzzleHints } from "../../shared/hooks/usePuzzleHints.js";
import { usePuzzleSession } from "../../shared/hooks/usePuzzleSession.js";
import { dealSetBoard, findSets, isSet } from "./set.logic.js";
import "./set.css";

const SET_TARGET = 5;
const SET_BEST_KEY = "eunContents.set.bestTime";
const COLOR_NAMES = ["코랄", "그린", "퍼플"];
const SHAPE_NAMES = ["타원", "다이아몬드", "물결"];
const SHADING_NAMES = ["채움", "줄무늬", "윤곽"];

export function SetGame({ game }) {
  const { playSound } = useGameAudio();
  const session = usePuzzleSession(SET_BEST_KEY);
  const [board, setBoard] = useState(() => dealSetBoard());
  const [selected, setSelected] = useState([]);
  const [revealedSet, setRevealedSet] = useState([]);
  const [found, setFound] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [status, setStatus] = useState("세 가지 카드를 골라 SET을 찾아보세요.");
  const feedbackSequenceRef = useRef(0);
  const feedbackTimerRef = useRef(null);
  const answer = findSets(board)[0] ?? [];
  const hint = usePuzzleHints(answer.length === 3 ? [
    {
      message: "표시한 두 카드의 색·모양·개수·채움을 하나씩 비교해보세요.",
      targetIndexes: answer.slice(0, 2),
    },
    {
      message: "두 카드에서 같은 속성은 세 번째도 같아야 하고, 다른 속성은 세 번째까지 모두 달라야 해요.",
      targetIndexes: answer.slice(0, 2),
    },
    {
      message: "표시한 세 장이 하나의 SET이에요. 네 속성이 각각 모두 같거나 모두 다른지 확인해보세요.",
      targetIndexes: answer,
    },
  ] : []);

  function startGame() {
    window.clearTimeout(feedbackTimerRef.current);
    setBoard(dealSetBoard());
    setSelected([]);
    setRevealedSet([]);
    setFound(0);
    setMistakes(0);
    setStreak(0);
    setActionFeedback(null);
    setStatus("세 가지 카드를 골라 SET을 찾아보세요.");
    hint.resetHints();
    session.start();
  }

  useEffect(() => () => window.clearTimeout(feedbackTimerRef.current), []);

  function showActionFeedback(nextStreak) {
    window.clearTimeout(feedbackTimerRef.current);
    feedbackSequenceRef.current += 1;
    setActionFeedback({
      id: feedbackSequenceRef.current,
      label: "NICE",
      combo: nextStreak,
    });
    feedbackTimerRef.current = window.setTimeout(() => setActionFeedback(null), 520);
  }

  function chooseCard(index) {
    if (session.phase !== "playing" || revealedSet.length > 0) return;
    if (selected.includes(index)) {
      setSelected((current) => current.filter((item) => item !== index));
      return;
    }
    const nextSelected = [...selected, index];
    if (nextSelected.length < 3) {
      setSelected(nextSelected);
      return;
    }

    const cards = nextSelected.map((item) => board[item]);
    if (!isSet(cards)) {
      setSelected([]);
      setMistakes((current) => current + 1);
      setStreak(0);
      setActionFeedback(null);
      setStatus("두 개만 같고 하나가 다른 속성이 있어요. 다시 찾아보세요.");
      playSound("wrong");
      return;
    }

    const nextFound = found + 1;
    const nextStreak = streak + 1;
    setFound(nextFound);
    setStreak(nextStreak);
    setSelected([]);
    showActionFeedback(nextStreak);
    playSound(nextFound === SET_TARGET ? "clear" : "correct");
    if (nextFound === SET_TARGET) {
      setStatus("다섯 개의 SET을 모두 찾았어요.");
      session.complete();
      return;
    }
    setBoard(dealSetBoard());
    setStatus("정답이에요! 새로운 카드에서 다음 SET을 찾아보세요.");
  }

  function revealAnswer() {
    setStreak(0);
    setActionFeedback(null);
    const [answer] = findSets(board);
    if (!answer) {
      setBoard(dealSetBoard());
      setSelected([]);
      setStatus("정답이 있는 새 카드로 바꿨어요.");
      return;
    }

    setSelected([]);
    setRevealedSet(answer);
    setStatus("정답 세 장을 표시했어요. 네 속성이 각각 모두 같거나 모두 다른지 비교해 보세요.");
  }

  function dealNextBoard() {
    setBoard(dealSetBoard());
    setSelected([]);
    setRevealedSet([]);
    setStreak(0);
    setActionFeedback(null);
    setStatus("새로운 카드에서 SET을 찾아보세요.");
  }

  return (
    <LogicPuzzleStage
      completionText="서로 같거나 모두 다른 속성을 빠르게 구분해 다섯 SET을 찾았어요."
      eyebrow="PATTERN / CARD"
      game={game}
      hint={hint}
      onReset={startGame}
      onStart={startGame}
      onSurrender={revealAnswer}
      session={session}
      stats={[
        { label: "Sets", value: `${found}/${SET_TARGET}` },
        { label: "Miss", value: mistakes },
        { label: "Combo", value: `×${streak}` },
      ]}
    >
      <div className="set-game">
        <div className="set-board-wrap">
          <div className="set-board" role="grid" aria-label="SET 카드 12장">
            {board.map((card, index) => (
              <button
                aria-label={`${COLOR_NAMES[card.color]} ${SHADING_NAMES[card.shading]} ${SHAPE_NAMES[card.shape]} ${card.count}개${revealedSet.includes(index) ? ", 정답 카드" : ""}${hint.currentStep?.targetIndexes?.includes(index) ? ", 힌트 카드" : ""}`}
                aria-pressed={selected.includes(index)}
                className={`set-card color-${card.color} shading-${card.shading}${selected.includes(index) ? " is-selected" : ""}${revealedSet.includes(index) ? " is-answer" : ""}${hint.currentStep?.targetIndexes?.includes(index) ? " is-hint-target" : ""}`}
                disabled={revealedSet.length > 0}
                key={`${card.id}-${index}`}
                onClick={() => chooseCard(index)}
                type="button"
              >
                {Array.from({ length: card.count }, (_, shapeIndex) => (
                  <span className={`set-symbol shape-${card.shape}`} key={shapeIndex} />
                ))}
              </button>
            ))}
          </div>
          <GameActionFeedback feedback={actionFeedback} />
        </div>
        <p className="logic-board-status" role="status">{status}</p>
        {session.phase === "playing" && revealedSet.length > 0 ? (
          <div className="logic-board-toolbar set-game__toolbar">
            <Button size="small" type="button" variant="secondary" onClick={dealNextBoard}>
              다음 카드
            </Button>
          </div>
        ) : null}
      </div>
    </LogicPuzzleStage>
  );
}
