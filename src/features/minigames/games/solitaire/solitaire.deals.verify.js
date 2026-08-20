import {
  drawSolitaireStock,
  isSolitaireWon,
  moveSolitaireSelection,
  SOLITAIRE_DRAW_COUNT,
} from "./solitaire.logic.js";
import { createCertifiedSolitaireDealFixture } from "./solitaire.deals.js";

function moveCardToFoundation(board, source) {
  const card = source.type === "waste"
    ? board.waste.at(-1)
    : board.tableau[source.column]?.at(-1);
  if (!card) return null;
  const result = moveSolitaireSelection(
    board,
    source.type === "waste"
      ? source
      : { ...source, index: board.tableau[source.column].length - 1 },
    { type: "foundation", suit: card.suit },
  );
  return result.moved ? result.state : null;
}

export function verifyCertifiedSolitaireDeal(seed, difficulty) {
  const { board: initialBoard, certificate } = createCertifiedSolitaireDealFixture(seed, difficulty);
  let board = initialBoard;

  for (let column = 1; column < 7; column += 1) {
    const result = moveSolitaireSelection(
      board,
      { type: "tableau", column, index: board.tableau[column].length - 1 },
      { type: "tableau", column: 0 },
    );
    if (!result.moved) return false;
    board = result.state;
  }

  const hiddenCardColumns = new Map();
  certificate.hiddenChunks.forEach((cards, column) => {
    cards.forEach((card) => hiddenCardColumns.set(card.id, column));
  });
  for (const card of certificate.hiddenOrder) {
    const column = hiddenCardColumns.get(card.id);
    board = moveCardToFoundation(board, { type: "tableau", column });
    if (!board) return false;
  }

  const drawCount = SOLITAIRE_DRAW_COUNT[difficulty];
  for (const action of certificate.stockPlan.actions) {
    if (action.type === "draw") {
      const drawn = drawSolitaireStock(board, drawCount);
      if (!drawn.moved) return false;
      board = drawn.state;
      continue;
    }
    if (action.type === "cover") {
      if (board.tableau[0].at(-1)?.id !== action.cardId) return false;
      board = moveCardToFoundation(board, { type: "tableau", column: 0 });
      if (!board) return false;
      continue;
    }
    if (board.waste.at(-1)?.id !== action.cardId) return false;
    board = moveCardToFoundation(board, { type: "waste" });
    if (!board) return false;
  }

  return certificate.stockPlan.solved && isSolitaireWon(board);
}
