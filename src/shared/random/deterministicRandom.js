export const DETERMINISTIC_RANDOM_MODULUS = 2_147_483_647;
export const DETERMINISTIC_RANDOM_MULTIPLIER = 48_271;

export function normalizeDeterministicSeed(seed) {
  const normalized = Math.floor(Number(seed));
  if (
    !Number.isSafeInteger(normalized)
    || normalized < 1
    || normalized >= DETERMINISTIC_RANDOM_MODULUS
  ) {
    throw new Error("서버가 유효하지 않은 난수 시드를 반환했습니다.");
  }
  return normalized;
}

export function advanceDeterministicRandom(seed) {
  return (normalizeDeterministicSeed(seed) * DETERMINISTIC_RANDOM_MULTIPLIER)
    % DETERMINISTIC_RANDOM_MODULUS;
}

export function deterministicRandomFraction(seed) {
  const nextSeed = advanceDeterministicRandom(seed);
  return {
    nextSeed,
    value: nextSeed / DETERMINISTIC_RANDOM_MODULUS,
  };
}

export function createDeterministicRandom(seed) {
  let state = normalizeDeterministicSeed(seed);
  return function deterministicRandom() {
    state = advanceDeterministicRandom(state);
    return state / DETERMINISTIC_RANDOM_MODULUS;
  };
}

export function createRandomSeed(random = Math.random) {
  return 1 + Math.floor(random() * (DETERMINISTIC_RANDOM_MODULUS - 1));
}
