export function createPuzzleElapsedClock(now = () => Date.now()) {
  let accumulatedMs = 0;
  let startedAt = 0;
  let running = false;

  function read() {
    return accumulatedMs + (running ? now() - startedAt : 0);
  }

  function pause() {
    accumulatedMs = read();
    running = false;
    return accumulatedMs;
  }

  return {
    pause,
    read,
    resetAndStart() {
      accumulatedMs = 0;
      startedAt = now();
      running = true;
    },
    resume() {
      if (running) return;
      startedAt = now();
      running = true;
    },
  };
}
