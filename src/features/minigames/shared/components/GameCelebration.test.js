import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const celebration = readFileSync(new URL("./GameCelebration.jsx", import.meta.url), "utf8");
const recordCelebration = readFileSync(new URL("./GameRecordCelebration.jsx", import.meta.url), "utf8");
const stageOverlay = readFileSync(new URL("./GameStageOverlay.jsx", import.meta.url), "utf8");
const stageDoodle = readFileSync(new URL("./GameStageDoodle.jsx", import.meta.url), "utf8");

describe("shared game celebration", () => {
  it("uses one record doodle composition for every celebration surface", () => {
    expect(celebration).toContain('variant="record"');
    expect(stageDoodle).toContain('part="record-face"');
    expect(stageDoodle).toContain('part="record-heart-left"');
    expect(stageDoodle).toContain('part="record-heart-right"');
    expect(stageDoodle).toContain('part="record-yeah"');
  });

  it("lets victory modals expose the shared celebration state", () => {
    expect(stageOverlay).toContain("GameCelebrationProvider");
    expect(stageOverlay).toContain("enabled={showCompletionStars}");
    expect(stageOverlay).not.toContain("normalizeModalChild");
  });

  it("shows the same artwork for a victory or a new record", () => {
    expect(recordCelebration).toContain("useGameCelebrationState");
    expect(recordCelebration).toContain("if (!isNewRecord && !isVictory) return null");
    expect(recordCelebration).toContain("<GameCelebration");
  });
});
