import { describe, expect, it } from "vitest";
import { parseAdvisoriesOutput } from "./check-database-advisors.mjs";

describe("parseAdvisoriesOutput", () => {
  it.each(["", "  \n  "])("treats a successful empty CLI response as no advisories", (output) => {
    expect(parseAdvisoriesOutput(output)).toEqual([]);
  });

  it("returns the advisory array emitted by the CLI", () => {
    const advisories = [{ name: "example", detail: "review me" }];
    expect(parseAdvisoriesOutput(JSON.stringify(advisories))).toEqual(advisories);
  });

  it.each(["{}", "null", "\"unexpected\""])("rejects a non-array JSON response", (output) => {
    expect(() => parseAdvisoriesOutput(output)).toThrow(/JSON array/);
  });

  it("rejects malformed non-empty output", () => {
    expect(() => parseAdvisoriesOutput("No issues found")).toThrow(SyntaxError);
  });
});
