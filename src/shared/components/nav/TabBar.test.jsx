// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { SETTINGS_PATH } from "../../../features/settings/settingsConstants.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { TabBar } = await import("./TabBar.jsx");

function renderTabBar(initialPath = "/") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TabBar />
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("TabBar layout", () => {
  it("renders the five primary navigation items as five direct grid cells", () => {
    const view = renderTabBar();
    expect(view.host.querySelector(".tabbar")?.children).toHaveLength(5);
    expect(
      [...view.host.querySelectorAll(".tabbar > a")].map((link) => link.textContent),
    ).toEqual(["Home", "Game", "Ranking", "Friends", "Settings"]);
    expect(view.host.querySelector(`a[href="${SETTINGS_PATH}"]`)).not.toBeNull();
    view.unmount();
  });
});
