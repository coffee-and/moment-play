import { FLAPPY_SESSION_MODE } from "./flappySession.js";

export const FLAPPY_RANKING_PROOF_VERSION = 1;
export const FLAPPY_RANKING_CHECKPOINT_TICKS = 1_000;
export const FLAPPY_RANKING_CHECKPOINT_LIMIT_TICKS = 1_500;

function createCourseProof(flapTicks, finalTick) {
  return {
    flapTicks: [...flapTicks],
    maxTicks: finalTick,
    proofVersion: FLAPPY_RANKING_PROOF_VERSION,
  };
}

export function createFlappyRankingRun({ attempt, onInvalidated, submitCheckpoint }) {
  let acceptedSequence = 0;
  let acceptedTick = 0;
  let acceptedStatus = "flying";
  let eligible = true;
  let flapTicks = [];
  let queuedSequence = 0;
  let queuedThroughTick = 0;
  let checkpointQueue = Promise.resolve();

  function invalidate(error) {
    if (!eligible) return;
    eligible = false;
    const message = error instanceof Error
      ? error.message
      : "공식 랭킹 검증을 이어갈 수 없어 로컬 기록으로 계속합니다.";
    onInvalidated?.(message);
  }

  function enqueueCheckpoint(toTick, expectedStatus) {
    if (!eligible || attempt.boardKey !== FLAPPY_SESSION_MODE.ENDLESS) return;
    if (toTick <= queuedThroughTick) return;

    const fromTick = queuedThroughTick;
    const chunkFlapTicks = flapTicks.filter((tick) => tick >= fromTick && tick < toTick);
    flapTicks = flapTicks.filter((tick) => tick >= toTick);
    queuedSequence += 1;
    queuedThroughTick = toTick;
    const sequence = queuedSequence;

    checkpointQueue = checkpointQueue.then(async () => {
      if (!eligible) return null;
      try {
        const response = await submitCheckpoint({
          attemptId: attempt.attemptId,
          flapTicks: chunkFlapTicks,
          sequence,
          toTick,
        });
        if (response.status !== expectedStatus) {
          throw new Error("서버와 별빛 비행 체크포인트 상태가 일치하지 않습니다.");
        }
        acceptedSequence = response.checkpointSequence;
        acceptedStatus = response.status;
        acceptedTick = response.tick;
        return response;
      } catch (error) {
        invalidate(error);
        return null;
      }
    });
  }

  function recordStep({ flapTick = null, simulation }) {
    if (!eligible) return;
    if (flapTick != null) flapTicks.push(flapTick);
    if (
      attempt.boardKey === FLAPPY_SESSION_MODE.ENDLESS
      && simulation.status === "flying"
      && simulation.tick - queuedThroughTick >= FLAPPY_RANKING_CHECKPOINT_TICKS
    ) enqueueCheckpoint(simulation.tick, "flying");
  }

  async function finishCourse(finalSimulation) {
    if (!eligible || attempt.boardKey !== FLAPPY_SESSION_MODE.COURSE) return null;
    if (finalSimulation.status !== "course-complete") {
      invalidate("완주한 코스만 공식 랭킹에 기록됩니다.");
      return null;
    }
    return createCourseProof(flapTicks, finalSimulation.tick);
  }

  async function finishEndless(finalSimulation) {
    if (!eligible || attempt.boardKey !== FLAPPY_SESSION_MODE.ENDLESS) return null;
    if (finalSimulation.status !== "over") {
      invalidate("종료된 무한 비행만 공식 랭킹에 기록됩니다.");
      return null;
    }

    await checkpointQueue;
    if (!eligible) return null;
    if (acceptedTick < finalSimulation.tick) enqueueCheckpoint(finalSimulation.tick, "over");
    await checkpointQueue;

    if (
      !eligible
      || acceptedTick !== finalSimulation.tick
      || acceptedStatus !== "over"
    ) {
      invalidate("서버와 비행 종료 상태가 일치하지 않아 로컬 기록으로만 저장합니다.");
      return null;
    }
    return {
      checkpointSequence: acceptedSequence,
      proofVersion: FLAPPY_RANKING_PROOF_VERSION,
    };
  }

  return {
    disqualify: invalidate,
    finishCourse,
    finishEndless,
    recordStep,
  };
}
