const FEATURE_VALUES = [0, 1, 2];

export function createSetDeck() {
  const deck = [];
  FEATURE_VALUES.forEach((color) => {
    FEATURE_VALUES.forEach((shape) => {
      FEATURE_VALUES.forEach((shading) => {
        FEATURE_VALUES.forEach((count) => {
          deck.push({
            id: `${color}-${shape}-${shading}-${count}`,
            color,
            shape,
            shading,
            count: count + 1,
          });
        });
      });
    });
  });
  return deck;
}

function featureIsSet(values) {
  return new Set(values).size !== 2;
}

export function isSet(cards) {
  if (cards.length !== 3) return false;
  return ["color", "shape", "shading", "count"]
    .every((feature) => featureIsSet(cards.map((card) => card[feature])));
}

export function findSets(cards) {
  const sets = [];
  for (let first = 0; first < cards.length - 2; first += 1) {
    for (let second = first + 1; second < cards.length - 1; second += 1) {
      for (let third = second + 1; third < cards.length; third += 1) {
        if (isSet([cards[first], cards[second], cards[third]])) sets.push([first, second, third]);
      }
    }
  }
  return sets;
}

function shuffleSetDeck(deck, randomFn = Math.random) {
  const next = [...deck];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function dealSetBoard(randomFn = Math.random) {
  const deck = createSetDeck();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const board = shuffleSetDeck(deck, randomFn).slice(0, 12);
    if (findSets(board).length > 0) return board;
  }
  return deck.slice(0, 12);
}
