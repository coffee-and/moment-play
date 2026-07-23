export const SOLITAIRE_DIFFICULTY = Object.freeze({
  EASY: "easy",
  HARD: "hard",
});

export const SOLITAIRE_DRAW_COUNT = Object.freeze({
  [SOLITAIRE_DIFFICULTY.EASY]: 1,
  [SOLITAIRE_DIFFICULTY.HARD]: 3,
});

export const SOLITAIRE_SUITS = Object.freeze([
  { id: "hearts", symbol: "♥", color: "red", label: "하트" },
  { id: "diamonds", symbol: "♦", color: "red", label: "다이아몬드" },
  { id: "clubs", symbol: "♣", color: "black", label: "클로버" },
  { id: "spades", symbol: "♠", color: "black", label: "스페이드" },
]);

export const SOLITAIRE_RANK_LABELS = Object.freeze({
  1: "A",
  11: "J",
  12: "Q",
  13: "K",
});

export function getSolitaireRankLabel(rank) {
  return SOLITAIRE_RANK_LABELS[rank] ?? String(rank);
}

export function createSolitaireDeck() {
  return SOLITAIRE_SUITS.flatMap((suit) => (
    Array.from({ length: 13 }, (_, index) => {
      const rank = index + 1;
      return {
        id: `${suit.id}-${rank}`,
        suit: suit.id,
        symbol: suit.symbol,
        color: suit.color,
        rank,
        faceUp: false,
      };
    })
  ));
}

export function shuffleSolitaireDeck(deck, random = Math.random) {
  const shuffled = deck.map((card) => ({ ...card }));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function dealSolitaire(random = Math.random) {
  const deck = shuffleSolitaireDeck(createSolitaireDeck(), random);
  const tableau = Array.from({ length: 7 }, () => []);
  let deckIndex = 0;

  for (let column = 0; column < tableau.length; column += 1) {
    for (let row = 0; row <= column; row += 1) {
      const card = { ...deck[deckIndex], faceUp: row === column };
      tableau[column].push(card);
      deckIndex += 1;
    }
  }

  return {
    stock: deck.slice(deckIndex).map((card) => ({ ...card, faceUp: false })),
    waste: [],
    foundations: Object.fromEntries(SOLITAIRE_SUITS.map((suit) => [suit.id, []])),
    tableau,
  };
}

export function canPlaceOnTableau(card, targetCard = null) {
  if (!card) return false;
  if (!targetCard) return card.rank === 13;
  return targetCard.faceUp && card.color !== targetCard.color && card.rank === targetCard.rank - 1;
}

export function canPlaceOnFoundation(card, foundation) {
  if (!card) return false;
  const topCard = foundation.at(-1) ?? null;
  if (!topCard) return card.rank === 1;
  return topCard.suit === card.suit && card.rank === topCard.rank + 1;
}

export function isValidTableauRun(cards, startIndex) {
  if (!Array.isArray(cards) || startIndex < 0 || startIndex >= cards.length) return false;
  if (!cards[startIndex]?.faceUp) return false;

  for (let index = startIndex; index < cards.length - 1; index += 1) {
    if (!canPlaceOnTableau(cards[index + 1], cards[index])) return false;
  }
  return true;
}

function exposeTableauTop(column) {
  if (column.length === 0 || column.at(-1).faceUp) return column;
  return column.map((card, index) => (
    index === column.length - 1 ? { ...card, faceUp: true } : card
  ));
}

function cloneState(state) {
  return {
    stock: state.stock.map((card) => ({ ...card })),
    waste: state.waste.map((card) => ({ ...card })),
    foundations: Object.fromEntries(
      SOLITAIRE_SUITS.map((suit) => [
        suit.id,
        (state.foundations[suit.id] ?? []).map((card) => ({ ...card })),
      ]),
    ),
    tableau: state.tableau.map((column) => column.map((card) => ({ ...card }))),
  };
}

export function drawSolitaireStock(state, drawCount = 1) {
  const next = cloneState(state);
  if (next.stock.length === 0) {
    if (next.waste.length === 0) return { state, moved: false };
    next.stock = next.waste.reverse().map((card) => ({ ...card, faceUp: false }));
    next.waste = [];
    return { state: next, moved: true };
  }

  const count = Math.min(Math.max(1, drawCount), next.stock.length);
  for (let index = 0; index < count; index += 1) {
    next.waste.push({ ...next.stock.pop(), faceUp: true });
  }
  return { state: next, moved: true };
}

function takeSelection(next, selection) {
  if (selection.type === "waste") {
    const card = next.waste.pop();
    return card ? { cards: [card] } : null;
  }

  if (selection.type === "foundation") {
    const pile = next.foundations[selection.suit] ?? [];
    const card = pile.pop();
    return card ? { cards: [card] } : null;
  }

  if (selection.type === "tableau") {
    const column = next.tableau[selection.column] ?? [];
    if (!isValidTableauRun(column, selection.index)) return null;
    const cards = column.splice(selection.index);
    return { cards, sourceColumn: selection.column };
  }

  return null;
}

function restoreSelection(next, selection, taken) {
  if (selection.type === "waste") next.waste.push(...taken.cards);
  if (selection.type === "foundation") next.foundations[selection.suit].push(...taken.cards);
  if (selection.type === "tableau") next.tableau[selection.column].push(...taken.cards);
}

export function moveSolitaireSelection(state, selection, destination) {
  if (!selection || !destination) return { state, moved: false };
  if (selection.type === "tableau" && destination.type === "tableau" && selection.column === destination.column) {
    return { state, moved: false };
  }

  const next = cloneState(state);
  const taken = takeSelection(next, selection);
  if (!taken?.cards.length) return { state, moved: false };
  const firstCard = taken.cards[0];

  if (destination.type === "tableau") {
    const targetColumn = next.tableau[destination.column];
    const targetCard = targetColumn?.at(-1) ?? null;
    if (!targetColumn || !canPlaceOnTableau(firstCard, targetCard)) {
      restoreSelection(next, selection, taken);
      return { state, moved: false };
    }
    targetColumn.push(...taken.cards);
  } else if (destination.type === "foundation") {
    if (taken.cards.length !== 1 || firstCard.suit !== destination.suit) {
      restoreSelection(next, selection, taken);
      return { state, moved: false };
    }
    const foundation = next.foundations[destination.suit];
    if (!canPlaceOnFoundation(firstCard, foundation)) {
      restoreSelection(next, selection, taken);
      return { state, moved: false };
    }
    foundation.push(firstCard);
  } else {
    restoreSelection(next, selection, taken);
    return { state, moved: false };
  }

  if (taken.sourceColumn !== undefined) {
    next.tableau[taken.sourceColumn] = exposeTableauTop(next.tableau[taken.sourceColumn]);
  }
  return { state: next, moved: true };
}

export function isSolitaireWon(state) {
  return SOLITAIRE_SUITS.every((suit) => (state.foundations[suit.id]?.length ?? 0) === 13);
}

export function getSolitaireSelectionCard(state, selection) {
  if (!selection) return null;
  if (selection.type === "waste") return state.waste.at(-1) ?? null;
  if (selection.type === "foundation") return state.foundations[selection.suit]?.at(-1) ?? null;
  if (selection.type === "tableau") return state.tableau[selection.column]?.[selection.index] ?? null;
  return null;
}
