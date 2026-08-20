// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = { status: "guest", user: null };
const beginRankedGameAttempt = vi.fn();
const submitGameResult = vi.fn();

vi.mock("../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../../infrastructure/supabase/gameResultsGateway.js", () => ({
  beginRankedGameAttempt,
  submitGameResult,
}));

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
  beginRankedGameAttempt.mockReset();
  submitGameResult.mockReset();
  latest = null;
});

describe("useGameResultSubmission", () => {
  it("keeps the result screen intact and blocks guest submissions", async () => {
    auth = { status: "guest", user: null };
    const view = renderHook();
    await act(async () => latest.submitResult({ proof: { rounds: [] } }));
    expect(latest.status).toBe("unauthenticated");
    expect(submitGameResult).not.toHaveBeenCalled();
    expect(view.host.textContent).toContain("RESULT SCREEN");
    view.unmount();
  });

  it("submits an authenticated terminal result only once per attempt", async () => {
    auth = { status: "authenticated", user: { id: "user-1" } };
    beginRankedGameAttempt.mockResolvedValue({
      attemptId: "22222222-2222-4222-8222-222222222222",
      boardKey: "classic",
      challengeKey: "all-time",
      gameKey: "2048",
      rulesVersion: "1",
      seed: 1234,
    });
    submitGameResult.mockResolvedValue({ duplicate: false });
    const view = renderHook();
    await act(async () => latest.startAttempt({
      boardKey: "classic",
      gameKey: "2048",
      rulesVersion: "1",
    }));
    const terminalResult = { proof: { moves: ["left"] } };
    await act(async () => {
      await Promise.all([latest.submitResult(terminalResult), latest.submitResult(terminalResult)]);
    });
    expect(submitGameResult).toHaveBeenCalledTimes(1);
    expect(latest.status).toBe("saved");
    view.unmount();
  });

  it("surfaces a failed save without removing the result screen and allows retry", async () => {
    auth = { status: "authenticated", user: { id: "user-1" } };
    beginRankedGameAttempt.mockResolvedValue({
      attemptId: "22222222-2222-4222-8222-222222222222",
      boardKey: "easy",
      challengeKey: "all-time",
      gameKey: "sudoku",
      rulesVersion: "1",
    });
    submitGameResult.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce({ duplicate: false });
    const view = renderHook();
    await act(async () => latest.startAttempt({
      gameKey: "sudoku",
      boardKey: "easy",
      rulesVersion: "1",
    }));
    await act(async () => latest.submitResult({
      proof: { puzzleId: "ocean-01", events: [] },
    }));
    expect(latest.status).toBe("error");
    expect(latest.errorMessage).toBe("network down");
    expect(view.host.textContent).toContain("RESULT SCREEN");
    await act(async () => latest.retry());
    expect(submitGameResult).toHaveBeenCalledTimes(2);
    expect(latest.status).toBe("saved");
    view.unmount();
  });
});
