// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = { status: "guest", user: null };
const submitGameResult = vi.fn();

vi.mock("../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../../infrastructure/supabase/gameResultsGateway.js", () => ({ submitGameResult }));

const { useGameResultSubmission } = await import("./useGameResultSubmission.js");

let latest;
function Harness() {
  latest = useGameResultSubmission();
  return <div>RESULT SCREEN</div>;
}

function renderHook() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<Harness />));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  auth = { status: "guest", user: null };
  submitGameResult.mockReset();
  latest = null;
});

describe("useGameResultSubmission", () => {
  it.each([
    ["guest", null],
    ["anonymous", { id: "anon-1", is_anonymous: true }],
  ])("keeps the result screen intact and blocks %s submissions", async (status, user) => {
    auth = { status, user };
    const view = renderHook();
    await act(async () => latest.submitResult({ gameKey: "memory", scoreValue: 3 }));
    expect(latest.status).toBe("unauthenticated");
    expect(submitGameResult).not.toHaveBeenCalled();
    expect(view.host.textContent).toContain("RESULT SCREEN");
    view.unmount();
  });

  it("submits an authenticated terminal result only once per attempt", async () => {
    auth = { status: "authenticated", user: { id: "user-1", is_anonymous: false } };
    submitGameResult.mockResolvedValue({ duplicate: false });
    const view = renderHook();
    const terminalResult = { gameKey: "2048", scoreValue: 4096 };
    await act(async () => {
      await Promise.all([latest.submitResult(terminalResult), latest.submitResult(terminalResult)]);
    });
    expect(submitGameResult).toHaveBeenCalledTimes(1);
    expect(latest.status).toBe("saved");
    view.unmount();
  });

  it("surfaces a failed save without removing the result screen and allows retry", async () => {
    auth = { status: "authenticated", user: { id: "user-1", is_anonymous: false } };
    submitGameResult.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce({ duplicate: false });
    const view = renderHook();
    await act(async () => latest.submitResult({ gameKey: "sudoku", mode: "easy", durationMs: 30000 }));
    expect(latest.status).toBe("error");
    expect(latest.errorMessage).toBe("network down");
    expect(view.host.textContent).toContain("RESULT SCREEN");
    await act(async () => latest.retry());
    expect(submitGameResult).toHaveBeenCalledTimes(2);
    expect(latest.status).toBe("saved");
    view.unmount();
  });
});
