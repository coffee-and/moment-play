// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINIGAMES_PATH } from "../../features/minigames/data/minigameCatalog.js";
import { LOGIN_PATH } from "../auth/authConstants.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = { status: "guest", user: null };

vi.mock("../auth/AuthContext.jsx", () => ({ useAuth: () => auth }));

const { Footer } = await import("./Footer.jsx");

function renderFooter() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<MemoryRouter><Footer /></MemoryRouter>));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  auth = { status: "guest", user: null };
});

describe("Footer", () => {
  it("uses shared routes and renders the current Moment Play copyright", () => {
    const view = renderFooter();
    const currentYear = new Date().getFullYear();

    expect(view.host.querySelector(`a[href="${MINIGAMES_PATH}"]`)?.textContent).toBe("Games");
    expect(view.host.querySelector(`a[href="${LOGIN_PATH}"]`)?.textContent).toBe("로그인");
    expect(view.host.querySelector(".foot-copy")?.textContent).toBe(
      `© ${currentYear} moment Play · 짧은 순간을 위한 미니게임.`,
    );
    view.unmount();
  });
});
