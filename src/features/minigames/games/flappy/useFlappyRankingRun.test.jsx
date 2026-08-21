// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const checkpointRankedFlappy = vi.fn();
const startAttempt = vi.fn();
const submitResult = vi.fn();

vi.mock("../../../../infrastructure/supabase/gameResultsGateway.js", () => ({
  checkpointRankedFlappy,
}));
vi.mock("../../../../shared/auth/AuthContext.jsx", () => ({
  useAuth: () => ({ status: "authenticated", user: { id: "user-1" } }),
}));
vi.mock("../../../ranking/useGameResultSubmission.js", () => ({
  useGameResultSubmission: () => ({
    canRetry: false,
    errorMessage: "",
    invalidateAttempt: vi.fn(),
    isSaving: false,
    isStarting: false,
    retry: vi.fn(),
    startAttempt,
    status: "idle",
    submitResult,
  }),
}));

const { useFlappyRankingRun } = await import("./useFlappyRankingRun.js");

let latest;
function Harness() {
  latest = useFlappyRankingRun();
  return null;
}

function renderHook() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<Harness />));
  return () => act(() => root.unmount());
}

afterEach(() => {
  document.body.innerHTML = "";
  checkpointRankedFlappy.mockReset();
  startAttempt.mockReset();
  submitResult.mockReset();
  latest = null;
});

describe("useFlappyRankingRun", () => {
  it("continues finalization after the game screen unmounts", async () => {
    let resolveCheckpoint;
    let resolveSubmission;
    startAttempt.mockResolvedValue({
      attemptId: "22222222-2222-4222-8222-222222222222",
      boardKey: "endless",
      payload: {
        checkpointTickLimit: 1_500,
        mode: "endless",
        proofVersion: 1,
        tickMs: 20,
      },
      ranked: true,
      seed: 12_345,
    });
    checkpointRankedFlappy
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockImplementation(() => new Promise((resolve) => {
        resolveCheckpoint = resolve;
      }));
    submitResult.mockImplementation(() => new Promise((resolve) => {
      resolveSubmission = resolve;
    }));
    const unmount = renderHook();

    await act(async () => latest.startRun("endless"));
    latest.recordStep({ flapTick: 120, simulation: { status: "over", tick: 151 } });

    let finishPromise;
    await act(async () => {
      finishPromise = latest.finishEndless({ status: "over", tick: 151 });
      await Promise.resolve();
    });
    expect(latest.submission.isFinalizing).toBe(true);

    await vi.waitFor(() => expect(resolveCheckpoint).toBeTypeOf("function"));
    unmount();
    resolveCheckpoint({ checkpointSequence: 1, status: "over", tick: 151 });
    await vi.waitFor(() => expect(submitResult).toHaveBeenCalled());
    expect(checkpointRankedFlappy).toHaveBeenCalledTimes(2);
    expect(submitResult).toHaveBeenCalledWith({
      proof: { checkpointSequence: 1, proofVersion: 1 },
    });
    resolveSubmission();
    await finishPromise;
  });
});
