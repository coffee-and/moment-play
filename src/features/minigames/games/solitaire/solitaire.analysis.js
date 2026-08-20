import {
  drawSolitaireStock,
  getSolitaireSelectionCard,
  isSolitaireWon,
  isValidTableauRun,
  moveSolitaireSelection,
  SOLITAIRE_SUITS,
} from "./solitaire.logic.js";

export const SOLITAIRE_PROGRESS_STATUS = Object.freeze({
  PLAYABLE: "playable",
  DRAW_REQUIRED: "draw-required",
  STALEMATE: "stalemate",
  WON: "won",
});

function getForwardSources(state) {
  const sources = [];
  if (state.waste.length > 0) sources.push({ type: "waste" });
  state.tableau.forEach((column, columnIndex) => {
    column.forEach((card, cardIndex) => {
      if (card.faceUp && isValidTableauRun(column, cardIndex)) {
        sources.push({ type: "tableau", column: columnIndex, index: cardIndex });
      }
    });
  });
  return sources;
}

function getFoundationSources(state) {
  return SOLITAIRE_SUITS
    .filter((suit) => state.foundations[suit.id]?.length > 0)
    .map((suit) => ({ type: "foundation", suit: suit.id }));
}

function wouldOnlyMoveFullKingColumn(state, source, destination) {
  if (source.type !== "tableau" || destination.type !== "tableau") return false;
  const sourceColumn = state.tableau[source.column] ?? [];
  const destinationColumn = state.tableau[destination.column] ?? [];
  return source.index === 0
    && sourceColumn[0]?.rank === 13
    && destinationColumn.length === 0;
}

export function listSolitaireLegalMoves(state, { includeFoundationSources = false } = {}) {
  const sources = [
    ...getForwardSources(state),
    ...(includeFoundationSources ? getFoundationSources(state) : []),
  ];
  const foundationMoves = [];
  const tableauMoves = [];

  sources.forEach((source) => {
    const card = getSolitaireSelectionCard(state, source);
    if (!card) return;

    const foundationDestination = { type: "foundation", suit: card.suit };
    if (
      source.type !== "foundation"
      && moveSolitaireSelection(state, source, foundationDestination).moved
    ) {
      foundationMoves.push({ type: "move", source, destination: foundationDestination, card });
    }

    state.tableau.forEach((_, column) => {
      const destination = { type: "tableau", column };
      if (wouldOnlyMoveFullKingColumn(state, source, destination)) return;
      if (moveSolitaireSelection(state, source, destination).moved) {
        tableauMoves.push({ type: "move", source, destination, card });
      }
    });
  });

  return [...foundationMoves, ...tableauMoves];
}

function encodeCard(card) {
  return `${card.id}${card.faceUp ? "+" : "-"}`;
}

export function getSolitaireStateKey(state) {
  const stock = state.stock.map(encodeCard).join(",");
  const waste = state.waste.map(encodeCard).join(",");
  const foundations = SOLITAIRE_SUITS
    .map((suit) => (state.foundations[suit.id] ?? []).map(encodeCard).join(","))
    .join("/");
  const tableau = state.tableau
    .map((column) => column.map(encodeCard).join(","))
    .join("/");
  return `${stock}|${waste}|${foundations}|${tableau}`;
}

export function analyzeSolitaireProgress(state, drawCount) {
  if (isSolitaireWon(state)) {
    return { status: SOLITAIRE_PROGRESS_STATUS.WON, legalMoves: [], drawSteps: 0 };
  }

  const legalMoves = listSolitaireLegalMoves(state, { includeFoundationSources: true });
  if (legalMoves.length > 0) {
    return { status: SOLITAIRE_PROGRESS_STATUS.PLAYABLE, legalMoves, drawSteps: 0 };
  }

  if (state.stock.length === 0 && state.waste.length === 0) {
    return { status: SOLITAIRE_PROGRESS_STATUS.STALEMATE, legalMoves: [], drawSteps: 0 };
  }

  let probe = state;
  let drawSteps = 0;
  const visited = new Set([getSolitaireStateKey(probe)]);

  while (true) {
    const drawn = drawSolitaireStock(probe, drawCount);
    if (!drawn.moved) {
      return { status: SOLITAIRE_PROGRESS_STATUS.STALEMATE, legalMoves: [], drawSteps };
    }
    probe = drawn.state;
    drawSteps += 1;

    const movesAfterDraw = listSolitaireLegalMoves(probe, { includeFoundationSources: true });
    if (movesAfterDraw.length > 0) {
      return {
        status: SOLITAIRE_PROGRESS_STATUS.DRAW_REQUIRED,
        legalMoves: movesAfterDraw,
        drawSteps,
      };
    }

    const key = getSolitaireStateKey(probe);
    if (visited.has(key)) {
      return { status: SOLITAIRE_PROGRESS_STATUS.STALEMATE, legalMoves: [], drawSteps };
    }
    visited.add(key);
  }
}

export function findSolitaireHint(state, drawCount = 1) {
  const analysis = analyzeSolitaireProgress(state, drawCount);
  if (analysis.status === SOLITAIRE_PROGRESS_STATUS.PLAYABLE) {
    return analysis.legalMoves[0] ?? null;
  }
  if (analysis.status === SOLITAIRE_PROGRESS_STATUS.DRAW_REQUIRED) {
    return { type: "draw", drawSteps: analysis.drawSteps };
  }
  return null;
}
