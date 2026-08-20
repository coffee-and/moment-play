import { createDeterministicRandom } from "../../shared/random/deterministicRandom.js";

export function createRankedRandom(seed) {
  return createDeterministicRandom(seed);
}
