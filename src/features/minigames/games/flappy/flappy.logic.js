import { getComboAward } from "../../shared/gameProgression.js";

export const FLAPPY_CONFIG = {
  birdX: 22,
  birdRadius: 2.7,
  gravity: 48,
  flapVelocity: -18,
  pipeWidth: 10,
  gapHeight: 29,
  pipeSpeed: 20,
  courseSpeedIncreasePerRound: 0.6,
  endlessSpeedIncreaseEveryMs: 45_000,
  endlessSpeedIncreaseStep: 0.2,
  maxPipeSpeed: 23.2,
  firstPipeX: 82,
  pipeSpacing: 48,
  initialLives: 2,
  recoverySeconds: 1.2,
  shieldChargePerGate: 4,
};

function createPipe(id, x, random) {
  return {
    id,
    x,
    gapY: 31 + random() * 38,
    passed: false,
  };
}

export function getFlappyPipeSpeed({
  endlessElapsedMs = 0,
  mode = "course",
  round = 1,
} = {}) {
  const courseSpeed = FLAPPY_CONFIG.pipeSpeed
    + (Math.max(1, Math.min(5, round)) - 1) * FLAPPY_CONFIG.courseSpeedIncreasePerRound;
  const endlessSpeed = mode === "endless"
    ? Math.floor(Math.max(0, endlessElapsedMs) / FLAPPY_CONFIG.endlessSpeedIncreaseEveryMs)
      * FLAPPY_CONFIG.endlessSpeedIncreaseStep
    : 0;
  return Math.min(
    FLAPPY_CONFIG.maxPipeSpeed,
    courseSpeed + endlessSpeed,
  );
}

export function createInitialFlappyState(random = Math.random) {
  return {
    birdY: 50,
    velocity: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    mistakes: 0,
    gatesPassed: 0,
    lives: FLAPPY_CONFIG.initialLives,
    shieldGauge: 0,
    shieldReady: false,
    recoverySeconds: 0,
    recoveryKind: null,
    nextPipeId: 2,
    pipes: [
      createPipe(0, FLAPPY_CONFIG.firstPipeX, random),
      createPipe(1, FLAPPY_CONFIG.firstPipeX + FLAPPY_CONFIG.pipeSpacing, random),
    ],
  };
}

export function flapFlappyState(state) {
  return {
    ...state,
    velocity: FLAPPY_CONFIG.flapVelocity,
  };
}

export function hasFlappyCollision(state) {
  if (state.recoverySeconds > 0) return false;
  const { birdRadius, birdX, gapHeight, pipeWidth } = FLAPPY_CONFIG;
  if (state.birdY - birdRadius <= 0 || state.birdY + birdRadius >= 100) return true;

  return state.pipes.some((pipe) => {
    const overlapsHorizontally = birdX + birdRadius >= pipe.x
      && birdX - birdRadius <= pipe.x + pipeWidth;
    if (!overlapsHorizontally) return false;

    const gapTop = pipe.gapY - gapHeight / 2;
    const gapBottom = pipe.gapY + gapHeight / 2;
    return state.birdY - birdRadius <= gapTop || state.birdY + birdRadius >= gapBottom;
  });
}

export function advanceFlappyState(
  state,
  deltaSeconds,
  { difficulty, random = Math.random } = {},
) {
  const delta = Math.min(Math.max(deltaSeconds, 0), 0.05);
  const velocity = state.velocity + FLAPPY_CONFIG.gravity * delta;
  const birdY = state.birdY + velocity * delta;
  const pipeSpeed = getFlappyPipeSpeed(difficulty);
  let scored = 0;

  let pipes = state.pipes
    .map((pipe) => {
      const x = pipe.x - pipeSpeed * delta;
      const justPassed = !pipe.passed && x + FLAPPY_CONFIG.pipeWidth < FLAPPY_CONFIG.birdX;
      if (justPassed) scored += 1;
      return {
        ...pipe,
        x,
        passed: pipe.passed || justPassed,
      };
    })
    .filter((pipe) => pipe.x + FLAPPY_CONFIG.pipeWidth > -4);

  let nextPipeId = state.nextPipeId;
  const lastPipeX = pipes.at(-1)?.x ?? FLAPPY_CONFIG.firstPipeX;
  if (lastPipeX < FLAPPY_CONFIG.firstPipeX) {
    pipes = [
      ...pipes,
      createPipe(nextPipeId, lastPipeX + FLAPPY_CONFIG.pipeSpacing, random),
    ];
    nextPipeId += 1;
  }

  let combo = state.combo;
  let scoreGain = 0;
  for (let index = 0; index < scored; index += 1) {
    combo += 1;
    scoreGain += getComboAward(10, combo).points;
  }
  const shieldGauge = state.shieldReady
    ? 100
    : Math.min(100, state.shieldGauge + scored * FLAPPY_CONFIG.shieldChargePerGate);
  const shieldReady = state.shieldReady || shieldGauge >= 100;

  const nextState = {
    ...state,
    birdY,
    velocity,
    score: state.score + scoreGain,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    gatesPassed: state.gatesPassed + scored,
    shieldGauge,
    shieldReady,
    recoverySeconds: Math.max(0, state.recoverySeconds - delta),
    recoveryKind: state.recoverySeconds - delta > 0 ? state.recoveryKind : null,
    nextPipeId,
    pipes,
  };

  return {
    state: nextState,
    scored,
    scoreGain,
    status: hasFlappyCollision(nextState) ? "collision" : "flying",
  };
}

export function recoverFlappyState(state) {
  const sharedRecovery = {
    ...state,
    birdY: 50,
    velocity: 0,
    combo: 0,
    mistakes: state.mistakes + 1,
    recoverySeconds: FLAPPY_CONFIG.recoverySeconds,
  };

  if (state.shieldReady) {
    return {
      state: {
        ...sharedRecovery,
        shieldGauge: 0,
        shieldReady: false,
        recoveryKind: "shield",
      },
      status: "shield",
    };
  }

  if (state.lives > 1) {
    return {
      state: {
        ...sharedRecovery,
        shieldGauge: 0,
        shieldReady: false,
        lives: state.lives - 1,
        recoveryKind: "life",
      },
      status: "life",
    };
  }

  return {
    state: {
      ...state,
      lives: 0,
      combo: 0,
      mistakes: state.mistakes + 1,
      shieldGauge: 0,
      shieldReady: false,
    },
    status: "over",
  };
}
