import { STONE } from "../omok.constants.js";

export const ONLINE_ROOM_STATUS = Object.freeze({
  WAITING: "waiting",
  PLAYING: "playing",
});

export const ONLINE_PLAYER_ROLE = Object.freeze({
  HOST: "host",
  GUEST: "guest",
});

export const ONLINE_ACTION_STATUS = Object.freeze({
  IDLE: "idle",
  CHECKING_PROFILE: "checking-profile",
  CREATING: "creating",
  JOINING: "joining",
  UPDATING_READY: "updating-ready",
  STARTING: "starting",
  SUBMITTING_MOVE: "submitting-move",
  REQUESTING_REMATCH: "requesting-rematch",
  CANCELLING_REMATCH: "cancelling-rematch",
  ACCEPTING_REMATCH: "accepting-rematch",
  LEAVING: "leaving",
  SAVING_NICKNAME: "saving-nickname",
});

export const ONLINE_ROOM_LOAD_STATUS = Object.freeze({
  IDLE: "idle",
  CHECKING_PROFILE: "checking-profile",
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
});

export const ONLINE_PENDING_ACTION = Object.freeze({
  CREATE_ROOM: "create-room",
  JOIN_ROOM: "join-room",
});

export const ONLINE_POLL_INTERVAL_MS = 1000;
export const ONLINE_COPY_RESET_MS = 1800;
export const ONLINE_NICKNAME_MIN_LENGTH = 2;
export const ONLINE_NICKNAME_MAX_LENGTH = 12;
export const ONLINE_ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ONLINE_ROLE_STONE = Object.freeze({
  [ONLINE_PLAYER_ROLE.HOST]: STONE.BLACK,
  [ONLINE_PLAYER_ROLE.GUEST]: STONE.WHITE,
});

export const ONLINE_ROLE_LABEL = Object.freeze({
  [ONLINE_PLAYER_ROLE.HOST]: "Host · Black",
  [ONLINE_PLAYER_ROLE.GUEST]: "Guest · White",
});
