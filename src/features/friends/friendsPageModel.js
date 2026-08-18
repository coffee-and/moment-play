export const FRIENDS_LOAD_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
};

const RELATIONSHIP_LABEL = {
  friend: "이미 친구",
  none: "새로운 친구",
  pending_incoming: "받은 요청이 있어요",
  pending_outgoing: "요청을 보냈어요",
};

export function normalizeFriendCode(value) {
  return String(value ?? "")
    .replace(/[^a-fA-F0-9]/g, "")
    .slice(0, 10)
    .toUpperCase();
}

export function getRelationshipLabel(status) {
  return RELATIONSHIP_LABEL[status] ?? "친구";
}

export function getFriendlyErrorMessage(error, fallback = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.") {
  const message = error instanceof Error ? error.message : String(error?.message ?? "");

  if (message.includes("Invalid friend code")) return "친구 코드는 영문 A–F와 숫자로 이루어진 10자리 코드예요.";
  if (message.includes("Friend code not found")) return "일치하는 친구 코드를 찾지 못했어요.";
  if (message.includes("You cannot add yourself")) return "내 친구 코드로는 요청을 보낼 수 없어요.";
  if (message.includes("Friend request already exists")) return "이미 친구 요청을 주고받고 있어요.";
  if (message.includes("Already friends")) return "이미 친구로 연결되어 있어요.";
  if (message.includes("Permanent account required")) return "친구 기능은 로그인한 계정에서 사용할 수 있어요.";
  if (message.includes("Pending friend request not found")) return "처리할 수 있는 친구 요청을 찾지 못했어요.";
  if (message.includes("Outgoing friend request not found")) return "취소할 수 있는 보낸 요청을 찾지 못했어요.";
  if (message.includes("Friendship not found")) return "삭제할 수 있는 친구 관계를 찾지 못했어요.";
  if (message.includes("Accepted friendship not found")) return "현재 친구로 연결된 사용자에게만 초대할 수 있어요.";
  if (message.includes("Active Omok invite already exists")) return "이미 이 친구와 응답을 기다리는 오목 초대가 있어요.";
  if (message.includes("Omok invite expired")) return "초대 시간이 만료됐어요. 새 초대를 보내 주세요.";
  if (message.includes("Omok invite is no longer pending")) return "이미 처리되었거나 만료된 오목 초대예요.";
  if (message.includes("Incoming Omok invite not found")) return "수락하거나 거절할 수 있는 초대를 찾지 못했어요.";
  if (message.includes("Outgoing Omok invite not found")) return "취소할 수 있는 보낸 초대를 찾지 못했어요.";
  if (message.includes("Omok invite room is unavailable")) return "초대 대기실을 사용할 수 없어요. 새 초대를 요청해 주세요.";

  return fallback;
}

export function groupFriendOverview(overview) {
  return {
    friends: overview.filter((item) => item.status === "accepted"),
    incoming: overview.filter((item) => item.status === "pending" && item.direction === "incoming"),
    outgoing: overview.filter((item) => item.status === "pending" && item.direction === "outgoing"),
  };
}

export function groupFriendInvites(invites) {
  return {
    incoming: invites.filter((item) => item.status === "pending" && item.direction === "incoming"),
    outgoing: invites.filter((item) => item.status === "pending" && item.direction === "outgoing"),
  };
}
