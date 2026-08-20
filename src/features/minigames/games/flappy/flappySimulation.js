import {
  advanceFlappyState,
  createInitialFlappyState,
  flapFlappyState,
  recoverFlappyState,
} from "./flappy.logic.js";
import {
  FLAPPY_SESSION_MODE,
  advanceFlappySession,
  createFlappyCourseSession,
  createFlappyEndlessSession,
  getFlappySessionDifficulty,
} from "./flappySession.js";

export const FLAPPY_SIMULATION_TICK_MS = 20;

function createSession(mode) {
  if (mode === FLAPPY_SESSION_MODE.COURSE) return createFlappyCourseSession();
  if (mode === FLAPPY_SESSION_MODE.ENDLESS) return createFlappyEndlessSession();
  throw new Error("지원하지 않는 비행 모드입니다.");
}

export function createFlappySimulation({ mode, seed }) {
  return {
    mode,
    session: createSession(mode),
    status: "flying",
    tick: 0,
    world: flapFlappyState(createInitialFlappyState(seed)),
  };
}

export function advanceFlappySimulation(simulation, { flap = false } = {}) {
  if (simulation.status !== "flying") {
    return {
      collisionRecovery: null,
      scoreGain: 0,
      scored: 0,
      sessionEvent: null,
      simulation,
    };
  }

  const inputWorld = flap ? flapFlappyState(simulation.world) : simulation.world;
  const worldResult = advanceFlappyState(
    inputWorld,
    FLAPPY_SIMULATION_TICK_MS / 1000,
    { difficulty: getFlappySessionDifficulty(simulation.session) },
  );
  const sessionResult = advanceFlappySession(
    simulation.session,
    FLAPPY_SIMULATION_TICK_MS,
  );

  if (sessionResult.event === "course-complete") {
    return {
      collisionRecovery: null,
      scoreGain: worldResult.scoreGain,
      scored: worldResult.scored,
      sessionEvent: sessionResult.event,
      simulation: {
        ...simulation,
        session: sessionResult.session,
        status: "course-complete",
        tick: simulation.tick + 1,
        world: worldResult.state,
      },
    };
  }

  let collisionRecovery = null;
  let nextWorld = worldResult.state;
  let status = "flying";
  if (worldResult.status === "collision") {
    const recovery = recoverFlappyState(worldResult.state);
    collisionRecovery = recovery.status;
    nextWorld = recovery.state;
    if (recovery.status === "over") status = "over";
  }

  return {
    collisionRecovery,
    scoreGain: worldResult.scoreGain,
    scored: worldResult.scored,
    sessionEvent: sessionResult.event,
    simulation: {
      ...simulation,
      session: sessionResult.session,
      status,
      tick: simulation.tick + 1,
      world: nextWorld,
    },
  };
}

export function replayFlappySimulation({ flapTicks, maxTicks, mode, seed }) {
  if (!Number.isSafeInteger(maxTicks) || maxTicks < 0) {
    throw new Error("비행 재생 길이가 올바르지 않습니다.");
  }

  const normalizedFlapTicks = [...flapTicks];
  if (normalizedFlapTicks.some((tick, index) => (
    !Number.isSafeInteger(tick)
    || tick < 0
    || tick >= maxTicks
    || (index > 0 && tick <= normalizedFlapTicks[index - 1])
  ))) {
    throw new Error("비행 입력 기록이 올바르지 않습니다.");
  }

  let simulation = createFlappySimulation({ mode, seed });
  let flapIndex = 0;
  while (simulation.tick < maxTicks && simulation.status === "flying") {
    const flap = normalizedFlapTicks[flapIndex] === simulation.tick;
    if (flap) flapIndex += 1;
    simulation = advanceFlappySimulation(simulation, { flap }).simulation;
  }
  if (simulation.tick < maxTicks) {
    throw new Error("비행 종료 이후의 입력 기록은 재생할 수 없습니다.");
  }
  return simulation;
}
