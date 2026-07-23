// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MiniGamesPage } from "./MiniGamesPage.jsx";
import { MINIGAMES_PATH } from "../data/minigameCatalog.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = vi.fn();

function renderPage() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter initialEntries={[MINIGAMES_PATH]}>
      <Routes>
        <Route path={MINIGAMES_PATH} element={<MiniGamesPage />} />
        <Route path="/minigames/omok" element={<div>Omok route</div>} />
      </Routes>
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("MiniGamesPage", () => {
  it("opens the selected game from the catalog", () => {
    const view = renderPage();
    const omokButton = [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Omok"));
    expect(omokButton).not.toBeNull();
    act(() => omokButton.click());
    expect(view.host.textContent).toContain("Omok route");
    view.unmount();
  });

  it("filters the catalog by category", () => {
    const view = renderPage();
    const memoryFilter = [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "Memory");
    act(() => memoryFilter.click());
    expect(view.host.textContent).toContain("Memory Sequence");
    expect(view.host.textContent).toContain("Glow Sequence");
    expect(view.host.textContent).not.toContain("Klondike Solitaire");
    view.unmount();
  });
});
