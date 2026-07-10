import { OMOK_MODE, OMOK_RESULT_REASON, STONE } from "../omok.constants.js";
import { createEmptyBoard, getNextStone, playMove } from "../domain/index.js";
import {
  ONLINE_NICKNAME_MAX_LENGTH,
  ONLINE_NICKNAME_MIN_LENGTH,
  ONLINE_PLAYER_ROLE,
  ONLINE_ROLE_STONE,
  ONLINE_ROOM_ID_PATTERN,
} from "./omokOnline.constants.js";

export function normalizeOnlineNickname(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function validateOnlineNickname(value) {
  const nickname = normalizeOnlineNickname(value);

  if (nickname.length < ONLINE_NICKNAME_MIN_LENGTH) {
    return { valid: false, value: nickname, message: "닉네임은 2자 이상 입력해 주세요." };
  }

  if (nickname.length > ONLINE_NICKNAME_MAX_LENGTH) {
    return { valid: false, value: nickname, message: "닉네임은 12자 이하로 입력해 주세요." };
  }

  return { valid: true, value: nickname, message: null };
}

export function getFallbackOnlineNickname(userId) {
  return `Guest-${String(userId ?? "").slice(0, 6)}`;
}

export function isFallbackOnlineNickname(nickname) {
  return !nickname || /^Guest-[0-9a-f]{6}$/i.test(nickname);
}

export function isValidOnlineRoomId(roomId) {
  return ONLINE_ROOM_ID_PATTERN.test(String(roomId ?? ""));
}

export function createOmokInviteUrl(roomId, locationLike = window.location) {
  const encodedRoomId = encodeURIComponent(roomId);
  return `${locationLike.origin}${locationLike.pathname}#/minigames/omok/room/${encodedRoomId}`;
}

export function getStoneForOnlineRole(role) {
  return ONLINE_ROLE_STONE[role] ?? null;
}

export function getOnlineRoleForStone(stone) {
  if (stone === STONE.BLACK) return ONLINE_PLAYER_ROLE.HOST;
  if (stone === STONE.WHITE) return ONLINE_PLAYER_ROLE.GUEST;
  return null;
}

export function getExpectedOnlineStone(moveNumber) {
  return moveNumber % 2 === 0 ? STONE.BLACK : STONE.WHITE;
}

export function getOnlinePlayerStone(room, userId) {
  const player = room?.players?.find((item) => item.userId === userId);
  return player ? getStoneForOnlineRole(player.role) : null;
}

export function mapOmokRoomRow(roomRow, playerRows = []) {
  return {
    id: roomRow.id,
    hostUserId: roomRow.host_user_id,
    title: roomRow.title,
    gameMode: roomRow.game_mode,
    status: roomRow.status,
    currentRound: roomRow.current_round,
    roundRequestedBy: roomRow.round_requested_by,
    players: playerRows.map(mapOmokPlayerRow).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
    createdAt: roomRow.created_at,
    updatedAt: roomRow.updated_at,
  };
}

export function mapOmokPlayerRow(playerRow) {
  return {
    roomId: playerRow.room_id,
    userId: playerRow.user_id,
    nickname: playerRow.nickname,
    role: playerRow.role,
    ready: Boolean(playerRow.ready),
    showForbiddenPositions: Boolean(playerRow.show_forbidden_positions),
    explainForbiddenReasons: Boolean(playerRow.explain_forbidden_reasons),
    joinedAt: playerRow.joined_at,
  };
}

export function mapOmokMoveRow(moveRow) {
  return {
    id: moveRow.id,
    roomId: moveRow.room_id,
    roundNumber: moveRow.round_number,
    moveNumber: moveRow.move_number,
    playerUserId: moveRow.player_user_id,
    stone: moveRow.stone,
    position: {
      row: moveRow.row_index,
      col: moveRow.col_index,
    },
    createdAt: moveRow.created_at,
  };
}

export function deriveOmokStateFromMoves(moves = [], gameMode = OMOK_MODE.STANDARD, roundNumber = null) {
  const targetMoves = roundNumber == null ? moves : moves.filter((move) => move.roundNumber === roundNumber);
  const sortedMoves = targetMoves.slice().sort((a, b) => a.moveNumber - b.moveNumber);
  let board = createEmptyBoard();
  let turn = STONE.BLACK;
  let lastMove = null;
  let winner = null;
  let winningLine = [];
  let draw = false;

  for (let index = 0; index < sortedMoves.length; index += 1) {
    const move = sortedMoves[index];

    if (move.moveNumber !== index) {
      return createInvalidOnlineDerivation(`착수 순서가 올바르지 않습니다. (${move.moveNumber})`);
    }

    if (move.stone !== getExpectedOnlineStone(index)) {
      return createInvalidOnlineDerivation("흑과 백의 착수 순서가 올바르지 않습니다.");
    }

    if (winner || draw) {
      return createInvalidOnlineDerivation("이미 종료된 라운드에 추가 착수가 있습니다.");
    }

    const result = playMove(board, move.position, move.stone, gameMode);

    if (!result.valid) {
      return createInvalidOnlineDerivation("동기화된 착수 목록에 유효하지 않은 수가 있습니다.");
    }

    board = result.board;
    lastMove = move.position;
    winner = result.winner;
    winningLine = result.winningLine;
    draw = result.draw;
    turn = getNextStone(move.stone);
  }

  return {
    valid: true,
    errorMessage: null,
    board,
    turn,
    lastMove,
    winner,
    winningLine,
    draw,
    moveCount: sortedMoves.length,
    resultReason: winner ? OMOK_RESULT_REASON.WIN : draw ? OMOK_RESULT_REASON.DRAW : null,
  };
}

function createInvalidOnlineDerivation(errorMessage) {
  return {
    valid: false,
    errorMessage,
    board: createEmptyBoard(),
    turn: STONE.BLACK,
    lastMove: null,
    winner: null,
    winningLine: [],
    draw: false,
    moveCount: 0,
    resultReason: null,
  };
}
