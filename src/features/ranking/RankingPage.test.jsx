// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = { isConfigured: true, status: "guest" };
const fetchLeaderboard = vi.fn();

vi.mock("../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../../infrastructure/supabase/gameResultsGateway.js", () => ({ fetchLeaderboard }));

const { RankingPage } = await import("./RankingPage.jsx");

async function renderPage() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<MemoryRouter><RankingPage /></MemoryRouter>));
  return { host, unmount: () => act(() => root.unmount()) };
}

function clickButton(host, label) {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent === label);
  act(() => button.click());
}

afterEach(() => {
  document.body.innerHTML = "";
  auth = { isConfigured: true, status: "guest" };
  fetchLeaderboard.mockReset();
});

describe("RankingPage", () => {
  it("shows an error and retries the same filter", async () => {
    fetchLeaderboard.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
    const view = await renderPage();
    await act(async () => {});
    expect(view.host.textContent).toContain("랭킹을 불러오지 못했습니다");
    clickButton(view.host, "다시 시도");
    await act(async () => {});
    expect(fetchLeaderboard).toHaveBeenCalledTimes(2);
    expect(view.host.textContent).toContain("아직 등록된 기록이 없습니다");
    view.unmount();
  });

  it("switches game filters and sends the selected Sudoku difficulty", async () => {
    fetchLeaderboard.mockResolvedValue([]);
    const view = await renderPage();
    await act(async () => {});
    clickButton(view.host, "Memory Order");
    await act(async () => {});
    expect(fetchLeaderboard).toHaveBeenLastCalledWith({ gameKey: "memory", mode: null });
    clickButton(view.host, "Sudoku");
    await act(async () => {});
    expect(fetchLeaderboard).toHaveBeenLastCalledWith({ gameKey: "sudoku", mode: "easy" });
    clickButton(view.host, "Advanced");
    await act(async () => {});
    expect(fetchLeaderboard).toHaveBeenLastCalledWith({ gameKey: "sudoku", mode: "advanced" });
    view.unmount();
  });
});
