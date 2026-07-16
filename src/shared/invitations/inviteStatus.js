const RESULT_STATUSES = new Set(["accepted", "declined", "cancelled", "expired"]);

export const INVITE_STATUS_LABEL = Object.freeze({
  accepted: "수락됨",
  declined: "거절됨",
  cancelled: "취소됨",
  expired: "만료됨",
});

export function isResolvedInvite(invite) {
  return Boolean(invite && RESULT_STATUSES.has(invite.status));
}

export function getInviteResultKey(invite) {
  if (!isResolvedInvite(invite) || !invite.inviteId) return "";
  return `${invite.inviteId}:${invite.status}`;
}

export function shouldNotifyInviteResult(invite) {
  if (!isResolvedInvite(invite)) return false;
  if (invite.status === "accepted" || invite.status === "declined") return invite.direction === "outgoing";
  if (invite.status === "cancelled") return invite.direction === "incoming";
  return invite.status === "expired";
}

export function getInviteResultMessage(invite) {
  if (!isResolvedInvite(invite)) return "";
  const nickname = invite.nickname || "친구";

  if (invite.status === "accepted") {
    return invite.direction === "outgoing"
      ? `${nickname}님이 오목 초대를 수락했어요.`
      : `${nickname}님의 오목 초대를 수락했어요.`;
  }
  if (invite.status === "declined") {
    return invite.direction === "outgoing"
      ? `${nickname}님이 오목 초대를 거절했어요.`
      : `${nickname}님의 오목 초대를 거절했어요.`;
  }
  if (invite.status === "cancelled") {
    return invite.direction === "incoming"
      ? `${nickname}님이 오목 초대를 취소했어요.`
      : `${nickname}님에게 보낸 오목 초대를 취소했어요.`;
  }
  return invite.direction === "outgoing"
    ? `${nickname}님에게 보낸 오목 초대가 만료됐어요.`
    : `${nickname}님의 오목 초대가 만료됐어요.`;
}

function resultTimestamp(invite) {
  const parsed = new Date(invite?.respondedAt ?? invite?.expiresAt ?? invite?.createdAt ?? 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getRecentInviteResults(invites, limit = 4) {
  return (Array.isArray(invites) ? invites : [])
    .filter(isResolvedInvite)
    .sort((left, right) => resultTimestamp(right) - resultTimestamp(left))
    .slice(0, Math.max(0, limit));
}
