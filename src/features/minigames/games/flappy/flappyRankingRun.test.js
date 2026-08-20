import { describe, expect, it, vi } from "vitest";
import { createFlappyRankingRun } from "./flappyRankingRun.js";

function createAttempt(boardKey) {
  return {
    attemptId: "22222222-2222-4222-8222-222222222222",
    boardKey,
  };
}

describe("flappy ranking run", () => {
  it("builds a course proof from fixed-tick flap input only after completion", async () => {
    const run = createFlappyRankingRun({ attempt: createAttempt("course") });
    run.recordStep({ flapTick: 4, simulation: { status: "flying", tick: 5 } });
    run.recordStep({ flapTick: 16, simulation: { status: "flying", tick: 17 } });

    await expect(run.finishCourse({ status: "course-complete", tick: 22_500 }))
      .resolves.toEqual({
        flapTicks: [4, 16],
        maxTicks: 22_500,
        proofVersion: 1,
      });
  });

  it("serializes bounded endless checkpoints and completes with the terminal sequence", async () => {
    const submitCheckpoint = vi.fn(async ({ sequence, toTick }) => ({
      checkpointSequence: sequence,
      status: toTick === 1_150 ? "over" : "flying",
      tick: toTick,
    }));
    const run = createFlappyRankingRun({
      attempt: createAttempt("endless"),
      submitCheckpoint,
    });

    run.recordStep({ flapTick: 12, simulation: { status: "flying", tick: 1_000 } });
    run.recordStep({ flapTick: 1_100, simulation: { status: "over", tick: 1_150 } });

    await expect(run.finishEndless({ status: "over", tick: 1_150 })).resolves.toEqual({
      checkpointSequence: 2,
      proofVersion: 1,
    });
    expect(submitCheckpoint.mock.calls.map(([checkpoint]) => checkpoint)).toEqual([
      {
        attemptId: "22222222-2222-4222-8222-222222222222",
        flapTicks: [12],
        sequence: 1,
        toTick: 1_000,
      },
      {
        attemptId: "22222222-2222-4222-8222-222222222222",
        flapTicks: [1_100],
        sequence: 2,
        toTick: 1_150,
      },
    ]);
  });

  it("invalidates the official run when a checkpoint cannot be verified", async () => {
    const onInvalidated = vi.fn();
    const run = createFlappyRankingRun({
      attempt: createAttempt("endless"),
      onInvalidated,
      submitCheckpoint: vi.fn().mockRejectedValue(new Error("network down")),
    });

    run.recordStep({ simulation: { status: "flying", tick: 1_000 } });

    await expect(run.finishEndless({ status: "over", tick: 1_100 })).resolves.toBeNull();
    expect(onInvalidated).toHaveBeenCalledOnce();
    expect(onInvalidated).toHaveBeenCalledWith("network down");
  });
});
