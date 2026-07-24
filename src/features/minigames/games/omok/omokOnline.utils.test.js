import { describe, expect, it } from "vitest";
import { OMOK_MODE, STONE } from "./omok.constants.js";
import {
  createOmokInviteUrl,
  deriveOmokStateFromMoves,
  getOnlinePlayerStone,
  isFallbackOnlineNickname,
  isValidOnlineRoomId,
  mapOmokRoomRow,
  normalizeOnlineNickname,
  validateOnlineNickname,
} from "./online/omokOnline.utils.js";

const roomId = "11111111-1111-4111-8111-111111111111";

function move(moveNumber, stone, row, col, roundNumber = 1) {
  return {
    id: `move-${moveNumber}`,
    moveNumber,
    position: { row, col },
    roundNumber,
    stone,
  };
}

describe("omok online nickname utilities", () => {
  it("normalizes repeated whitespace", () => {
    expect(normalizeOnlineNickname("  eun   player  ")).toBe("eun player");
  });

  it("validates nickname length", () => {
    expect(validateOnlineNickname("a").valid).toBe(false);
    expect(validateOnlineNickname("1234567890123").valid).toBe(false);
    expect(validateOnlineNickname("친구").valid).toBe(true);
  });

  it("detects fallback nicknames", () => {
    expect(isFallbackOnlineNickname("Guest-abcdef")).toBe(true);
    expect(isFallbackOnlineNickname("coffee")).toBe(false);
  });
});

describe("omok online invite URLs", () => {
  it("uses the HashRouter room route and preserves the deployment base path", () => {
    const url = createOmokInviteUrl(roomId, {
      origin: "https://example.com",
      pathname: "/moment-play/",
    });

    expect(url).toBe(`https://example.com/moment-play/#/minigames/omok/room/${roomId}`);
  });

  it("encodes room IDs and rejects malformed UUIDs", () => {
    expect(createOmokInviteUrl("room/with/slash", { origin: "https://x.test", pathname: "/" })).toContain("room%2Fwith%2Fslash");
    expect(isValidOnlineRoomId(roomId)).toBe(true);
    expect(isValidOnlineRoomId("not-a-room")).toBe(false);
  });
});

describe("deriveOmokStateFromMoves", () => {
  it("creates an empty board from an empty move list", () => {
    const state = deriveOmokStateFromMoves([], OMOK_MODE.STANDARD, 1);
    expect(state.valid).toBe(true);
    expect(state.moveCount).toBe(0);
    expect(state.turn).toBe(STONE.BLACK);
  });

  it("replays ordered moves and derives turn, last move, and winner", () => {
    const state = deriveOmokStateFromMoves(
      [
        move(0, STONE.BLACK, 7, 3),
        move(1, STONE.WHITE, 0, 0),
        move(2, STONE.BLACK, 7, 4),
        move(3, STONE.WHITE, 0, 1),
        move(4, STONE.BLACK, 7, 5),
        move(5, STONE.WHITE, 0, 2),
        move(6, STONE.BLACK, 7, 6),
        move(7, STONE.WHITE, 0, 3),
        move(8, STONE.BLACK, 7, 7),
      ],
      OMOK_MODE.STANDARD,
      1,
    );

    expect(state.valid).toBe(true);
    expect(state.winner).toBe(STONE.BLACK);
    expect(state.winningLine).toHaveLength(5);
    expect(state.lastMove).toEqual({ row: 7, col: 7 });
  });

  it("excludes previous-round moves", () => {
    const state = deriveOmokStateFromMoves(
      [
        move(0, STONE.BLACK, 7, 7, 1),
        move(0, STONE.BLACK, 8, 8, 2),
      ],
      OMOK_MODE.STANDARD,
      2,
    );

    expect(state.moveCount).toBe(1);
    expect(state.board[8][8]).toBe(STONE.BLACK);
    expect(state.board[7][7]).toBeNull();
  });

  it("rejects duplicate move numbers, invalid stone sequence, and invalid board positions", () => {
    expect(deriveOmokStateFromMoves([move(0, STONE.BLACK, 7, 7), move(0, STONE.WHITE, 8, 8)], OMOK_MODE.STANDARD, 1).valid).toBe(false);
    expect(deriveOmokStateFromMoves([move(0, STONE.WHITE, 7, 7)], OMOK_MODE.STANDARD, 1).valid).toBe(false);
    expect(deriveOmokStateFromMoves([move(0, STONE.BLACK, 99, 7)], OMOK_MODE.STANDARD, 1).valid).toBe(false);
  });
});

describe("online room mapping helpers", () => {
  it("resolves host to black and guest to white", () => {
    const room = {
      players: [
        { role: "host", userId: "host" },
        { role: "guest", userId: "guest" },
      ],
    };

    expect(getOnlinePlayerStone(room, "host")).toBe(STONE.BLACK);
    expect(getOnlinePlayerStone(room, "guest")).toBe(STONE.WHITE);
  });

  it("maps room-level guide permission columns to camelCase booleans", () => {
    const room = mapOmokRoomRow({
      allow_forbidden_positions: false,
      allow_forbidden_reasons: true,
      created_at: "2026-01-01T00:00:00.000Z",
      current_round: 1,
      game_mode: OMOK_MODE.STANDARD,
      host_user_id: "host",
      id: roomId,
      round_requested_by: null,
      status: "waiting",
      title: "Host님의 방",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    expect(room.allowForbiddenPositions).toBe(false);
    expect(room.allowForbiddenReasons).toBe(true);
  });
});
