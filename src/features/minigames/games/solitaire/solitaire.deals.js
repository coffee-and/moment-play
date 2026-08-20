import {
  createSolitaireDeck,
  SOLITAIRE_DIFFICULTY,
  SOLITAIRE_DRAW_COUNT,
  SOLITAIRE_SUITS,
} from "./solitaire.logic.js";

const DEAL_VERSION = 1;
const COVER_RANKS = [13, 12, 11, 10, 9, 8, 7];
const HIDDEN_CARD_COUNT = 21;
const DEAL_SEEDS = Object.freeze({
  [SOLITAIRE_DIFFICULTY.EASY]: [137, 271, 419, 563, 701, 853, 991, 1153, 1297, 1451, 1607, 1783],
  [SOLITAIRE_DIFFICULTY.HARD]: [193, 347, 487, 631, 787, 929, 1061, 1217, 1361, 1511, 1663, 1823],
});

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle(values, random) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function toCard(card, faceUp) {
  return { ...card, faceUp };
}

function arrangeStock(cards, drawCount) {
  const groups = [];
  for (let index = 0; index < cards.length; index += drawCount) {
    groups.push(cards.slice(index, index + drawCount));
  }
  return groups.reverse().flat().map((card) => toCard(card, false));
}

function getFoundationRanks(cards) {
  return Object.fromEntries(SOLITAIRE_SUITS.map((suit) => [
    suit.id,
    cards.filter((card) => card.suit === suit.id).reduce((rank, card) => Math.max(rank, card.rank), 0),
  ]));
}

function createStockSolutionPlan(initialStock, hiddenOrder, coverCards, drawCount) {
  let stock = [...initialStock];
  let waste = [];
  let coverIndex = coverCards.length - 1;
  let foundationRanks = getFoundationRanks(hiddenOrder);
  let recycledCount = 0;
  const actions = [];
  const visited = new Set();

  for (let step = 0; step < 600; step += 1) {
    const cover = coverCards[coverIndex];
    if (cover && foundationRanks[cover.suit] + 1 === cover.rank) {
      foundationRanks = { ...foundationRanks, [cover.suit]: cover.rank };
      coverIndex -= 1;
      actions.push({ type: "cover", cardId: cover.id });
      continue;
    }

    const wasteCard = waste.at(-1);
    if (wasteCard && foundationRanks[wasteCard.suit] + 1 === wasteCard.rank) {
      waste = waste.slice(0, -1);
      foundationRanks = { ...foundationRanks, [wasteCard.suit]: wasteCard.rank };
      actions.push({ type: "waste", cardId: wasteCard.id });
      continue;
    }

    if (coverIndex < 0 && stock.length === 0 && waste.length === 0) {
      return { solved: true, actions, recycledCount };
    }

    const key = [
      stock.map((card) => card.id).join(","),
      waste.map((card) => card.id).join(","),
      coverIndex,
      SOLITAIRE_SUITS.map((suit) => foundationRanks[suit.id]).join(","),
    ].join("|");
    if (visited.has(key)) return { solved: false, actions: [], recycledCount };
    visited.add(key);

    if (stock.length === 0) {
      stock = [...waste].reverse().map((card) => toCard(card, false));
      waste = [];
      recycledCount += 1;
      actions.push({ type: "draw" });
      continue;
    }

    const nextStock = [...stock];
    const nextWaste = [...waste];
    const count = Math.min(drawCount, nextStock.length);
    for (let index = 0; index < count; index += 1) {
      nextWaste.push(toCard(nextStock.pop(), true));
    }
    stock = nextStock;
    waste = nextWaste;
    actions.push({ type: "draw" });
  }

  return { solved: false, actions: [], recycledCount };
}

function arrangeCertifiedStock(cards, hiddenOrder, coverCards, difficulty, random) {
  const drawCount = SOLITAIRE_DRAW_COUNT[difficulty];
  const directStock = arrangeStock(cards, drawCount);
  if (difficulty === SOLITAIRE_DIFFICULTY.EASY) {
    return {
      stock: directStock,
      plan: createStockSolutionPlan(directStock, hiddenOrder, coverCards, drawCount),
    };
  }

  for (let attempt = 0; attempt < 800; attempt += 1) {
    const candidate = shuffle(cards, random).map((card) => toCard(card, false));
    const plan = createStockSolutionPlan(candidate, hiddenOrder, coverCards, drawCount);
    if (plan.solved && plan.recycledCount >= 1) return { stock: candidate, plan };
  }

  return {
    stock: directStock,
    plan: createStockSolutionPlan(directStock, hiddenOrder, coverCards, drawCount),
  };
}

function buildConstructedDeal(seed, difficulty) {
  const random = createSeededRandom(seed);
  const deck = createSolitaireDeck();
  const cardById = new Map(deck.map((card) => [card.id, card]));
  const suitsByColor = {
    black: SOLITAIRE_SUITS.filter((suit) => suit.color === "black"),
    red: SOLITAIRE_SUITS.filter((suit) => suit.color === "red"),
  };
  const firstColor = random() < 0.5 ? "red" : "black";
  const coverCards = COVER_RANKS.map((rank, index) => {
    const color = index % 2 === 0
      ? firstColor
      : firstColor === "red" ? "black" : "red";
    const candidates = suitsByColor[color];
    const suit = candidates[Math.floor(random() * candidates.length)];
    return cardById.get(`${suit.id}-${rank}`);
  });
  const coverIds = new Set(coverCards.map((card) => card.id));
  const foundationOrder = Array.from({ length: 13 }, (_, rankIndex) => (
    shuffle(SOLITAIRE_SUITS, random).map((suit) => cardById.get(`${suit.id}-${rankIndex + 1}`))
  )).flat();
  const availableOrder = foundationOrder.filter((card) => !coverIds.has(card.id));
  const hiddenOrder = availableOrder.slice(0, HIDDEN_CARD_COUNT);
  const stockOrder = availableOrder.slice(HIDDEN_CARD_COUNT);
  const hiddenColumnOrder = shuffle([1, 2, 3, 4, 5, 6], random);
  const hiddenChunks = new Map();
  let hiddenCursor = 0;

  hiddenColumnOrder.forEach((column) => {
    hiddenChunks.set(column, hiddenOrder.slice(hiddenCursor, hiddenCursor + column));
    hiddenCursor += column;
  });

  const tableau = [
    [toCard(coverCards[0], true)],
    ...Array.from({ length: 6 }, (_, index) => {
      const column = index + 1;
      const hidden = hiddenChunks.get(column) ?? [];
      return [
        ...[...hidden].reverse().map((card) => toCard(card, false)),
        toCard(coverCards[column], true),
      ];
    }),
  ];
  const stock = arrangeCertifiedStock(stockOrder, hiddenOrder, coverCards, difficulty, random);

  return {
    board: {
      stock: stock.stock,
      waste: [],
      foundations: Object.fromEntries(SOLITAIRE_SUITS.map((suit) => [suit.id, []])),
      tableau,
    },
    certificate: {
      coverCards,
      hiddenColumnOrder,
      hiddenChunks,
      hiddenOrder,
      stockPlan: stock.plan,
    },
  };
}

export function getSolitaireDealSeeds(difficulty) {
  return [...(DEAL_SEEDS[difficulty] ?? DEAL_SEEDS[SOLITAIRE_DIFFICULTY.EASY])];
}

export function createCertifiedSolitaireDeal(difficulty, random = Math.random, excludedDealId = null) {
  const safeDifficulty = Object.hasOwn(DEAL_SEEDS, difficulty)
    ? difficulty
    : SOLITAIRE_DIFFICULTY.EASY;
  const seeds = DEAL_SEEDS[safeDifficulty];
  const candidates = seeds.filter((seed) => `${DEAL_VERSION}-${safeDifficulty}-${seed}` !== excludedDealId);
  const source = candidates.length > 0 ? candidates : seeds;
  const seed = source[Math.floor(random() * source.length)] ?? source[0];
  const { board } = buildConstructedDeal(seed, safeDifficulty);
  return {
    board,
    id: `${DEAL_VERSION}-${safeDifficulty}-${seed}`,
  };
}

export function createCertifiedSolitaireDealFixture(seed, difficulty) {
  return buildConstructedDeal(seed, difficulty);
}
