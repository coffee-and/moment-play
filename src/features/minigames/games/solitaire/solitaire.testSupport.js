export function createEmptyBoardForTest(overrides = {}) {
  return {
    stock: [],
    waste: [],
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
    tableau: Array.from({ length: 7 }, () => []),
    ...overrides,
  };
}
