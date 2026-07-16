import { describe, expect, it } from "vitest";
import {
  getInviteResultMessage,
  getRecentInviteResults,
  shouldNotifyInviteResult,
} from "./inviteStatus.js";

describe("invite result messaging", () => {
  it("notifies the sender when the receiver declines", () => {
    const invite = {
      inviteId: "invite-1",
      direction: "outgoing",
      status: "declined",
      nickname: "후츄",
    };
    expect(shouldNotifyInviteResult(invite)).toBe(true);
    expect(getInviteResultMessage(invite)).toBe("후츄님이 오목 초대를 거절했어요.");
  });

  it("does not notify the receiver about their own decline action", () => {
    expect(shouldNotifyInviteResult({
      inviteId: "invite-1",
      direction: "incoming",
      status: "declined",
      nickname: "바비",
    })).toBe(false);
  });

  it("notifies the receiver when the sender cancels", () => {
    const invite = {
      inviteId: "invite-2",
      direction: "incoming",
      status: "cancelled",
      nickname: "바비",
    };
    expect(shouldNotifyInviteResult(invite)).toBe(true);
    expect(getInviteResultMessage(invite)).toBe("바비님이 오목 초대를 취소했어요.");
  });

  it("sorts recent resolved results by response time and excludes pending invites", () => {
    const results = getRecentInviteResults([
      { inviteId: "pending", status: "pending", respondedAt: null },
      { inviteId: "older", status: "declined", respondedAt: "2026-07-16T10:00:00Z" },
      { inviteId: "newer", status: "accepted", respondedAt: "2026-07-16T11:00:00Z" },
    ], 2);
    expect(results.map((invite) => invite.inviteId)).toEqual(["newer", "older"]);
  });
});
