const RANKED_RANDOM_MODULUS = 2147483647;
const RANKED_RANDOM_MULTIPLIER = 48271;

export function createRankedRandom(seed) {
  let state = Math.floor(Number(seed));
  if (!Number.isSafeInteger(state) || state < 1 || state >= RANKED_RANDOM_MODULUS) {
    throw new Error("서버가 유효하지 않은 랭킹 시드를 반환했습니다.");
  }

  return function rankedRandom() {
    state = (state * RANKED_RANDOM_MULTIPLIER) % RANKED_RANDOM_MODULUS;
    return state / RANKED_RANDOM_MODULUS;
  };
}
