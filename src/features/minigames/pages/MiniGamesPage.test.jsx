// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../shared/theme/ThemeContext.jsx";
import { MiniGamesPage } from "./MiniGamesPage.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("MiniGamesPage", () => {
  it("shows game discovery without development quick-match copy and opens Omok", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(
      <ThemeProvider>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<MiniGamesPage />} />
            <Route path="/minigames/omok" element={<div>Omok route</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    ));

    expect(host.textContent).toContain("전체 게임");
    expect(host.textContent).not.toContain("Quick match");
    expect(host.textContent).not.toContain("UI 보기");
    expect(host.textContent).not.toContain("추후 서버 매칭 자리");
    const omokButton = Array.from(host.querySelectorAll("button")).find((button) => button.textContent.includes("오목 시작하기"));
    act(() => omokButton.click());
    expect(host.textContent).toContain("Omok route");
    act(() => root.unmount());
  });
});
