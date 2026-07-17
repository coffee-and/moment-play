export const FLAPPY_CONFIG = {
  birdX: 22,
  birdRadius: 2.7,
  gravity: 48,
  flapVelocity: -18,
  pipeWidth: 10,
  gapHeight: 29,
  pipeSpeed: 20,
  firstPipeX: 82,
  pipeSpacing: 48,
};

function createPipe(id, x, random) {
  return {
    id,
    x,
    gapY: 31 + random() * 38,
    passed: false,
  };
}

export function createInitialFlappyState(random = Math.random) {
  return {
    birdY: 50,
    velocity: 0,
    score: 0,
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

export function advanceFlappyState(state, deltaSeconds, random = Math.random) {
  const delta = Math.min(Math.max(deltaSeconds, 0), 0.05);
  const velocity = state.velocity + FLAPPY_CONFIG.gravity * delta;
  const birdY = state.birdY + velocity * delta;
  let scored = 0;

  let pipes = state.pipes
    .map((pipe) => {
      const x = pipe.x - FLAPPY_CONFIG.pipeSpeed * delta;
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

  const nextState = {
    ...state,
    birdY,
    velocity,
    score: state.score + scored,
    nextPipeId,
    pipes,
  };

  return {
    state: nextState,
    scored,
    status: hasFlappyCollision(nextState) ? "collision" : "flying",
  };
}
