import { COMPUTER_DIFFICULTY } from "../omok.constants.js";
import { getNextStone, playMove, positionKey } from "../domain/index.js";
import { getCandidateMoves } from "./candidates.js";
import { scoreComputerMove, scoreMoveForStone } from "./scoring.js";

const EASY_CANDIDATE_LIMIT = 6;

function compareScoredMoves(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  if (a.position.row !== b.position.row) return a.position.row - b.position.row;
  return a.position.col - b.position.col;
}

function scoreCandidates(board, candidates, computerStone, gameMode) {
  return candidates
    .map((position) => ({
      position,
      score: scoreComputerMove(board, position, computerStone, gameMode),
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort(compareScoredMoves);
}

function getImmediateWinningMoves(board, stone, gameMode) {
  return getCandidateMoves(board, stone, gameMode).filter((position) =>
    Boolean(playMove(board, position, stone, gameMode).winner),
  );
}

function chooseBestStaticMove(board, candidates, computerStone, gameMode) {
  return scoreCandidates(board, candidates, computerStone, gameMode)[0]?.position ?? null;
}

function chooseEasyMove(board, candidates, computerStone, gameMode, random) {
  const preferredMoves = scoreCandidates(board, candidates, computerStone, gameMode).slice(0, EASY_CANDIDATE_LIMIT);

  if (preferredMoves.length === 0) return null;

  const weightedIndex = Math.min(
    preferredMoves.length - 1,
    Math.floor(random() ** 2 * preferredMoves.length),
  );

  return preferredMoves[weightedIndex].position;
}

function chooseHardMove(board, candidates, computerStone, gameMode, candidateLimit) {
  const opponent = getNextStone(computerStone);
  const shortlist = scoreCandidates(board, candidates, computerStone, gameMode).slice(0, candidateLimit);

  const evaluated = shortlist.map(({ position, score }) => {
    const result = playMove(board, position, computerStone, gameMode);
    if (!result.valid) return { position, score: Number.NEGATIVE_INFINITY };
    if (result.winner === computerStone) {
      return { position, score: Number.POSITIVE_INFINITY };
    }

    const strongestReply = getCandidateMoves(result.board, opponent, gameMode)
      .map((reply) => ({
        position: reply,
        score: scoreMoveForStone(result.board, reply, opponent, gameMode),
      }))
      .filter((reply) => Number.isFinite(reply.score))
      .sort(compareScoredMoves)
      .slice(0, candidateLimit)[0]?.score ?? 0;

    return {
      position,
      score: score - strongestReply * 0.78,
    };
  });

  evaluated.sort(compareScoredMoves);
  return evaluated[0]?.position ?? null;
}

export function chooseComputerMove(
  board,
  computerStone,
  gameMode,
  difficulty,
  options = {},
) {
  const candidates = getCandidateMoves(board, computerStone, gameMode);
  if (candidates.length === 0) return null;

  const winningMoves = getImmediateWinningMoves(board, computerStone, gameMode);
  if (winningMoves.length > 0) return winningMoves[0];

  const opponent = getNextStone(computerStone);
  const candidateKeys = new Set(candidates.map(positionKey));
  const blockingMoves = getImmediateWinningMoves(board, opponent, gameMode).filter((position) =>
    candidateKeys.has(positionKey(position)),
  );

  if (blockingMoves.length > 0) {
    return chooseBestStaticMove(board, blockingMoves, computerStone, gameMode);
  }

  if (difficulty === COMPUTER_DIFFICULTY.EASY) {
    return chooseEasyMove(board, candidates, computerStone, gameMode, options.random ?? Math.random);
  }

  if (difficulty === COMPUTER_DIFFICULTY.NORMAL) {
    return chooseBestStaticMove(board, candidates, computerStone, gameMode);
  }

  return chooseHardMove(board, candidates, computerStone, gameMode, options.candidateLimit ?? 12);
}
