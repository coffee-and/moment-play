// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const signIn = vi.fn();
const signUp = vi.fn();
let auth = {
  isConfigured: true,
  signIn,
  signUp,
  status: "guest",
};
let currentLocation;

vi.mock("../../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));

const { LoginPage } = await import("./LoginPage.jsx");
const { SignupPage } = await import("./SignupPage.jsx");

function LocationProbe() {
  currentLocation = useLocation();
  return null;
}

function renderPage(initialEntry, page) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={page === "login" ? <LoginPage /> : null} />
          <Route path="/signup" element={page === "signup" ? <SignupPage /> : null} />
          <Route path="/minigames/:gameId" element={<div>Intended game</div>} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );
  });
  return { host, unmount: () => act(() => root.unmount()) };
}

function changeInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  auth = { isConfigured: true, signIn, signUp, status: "guest" };
  currentLocation = null;
});

describe("email authentication pages", () => {
  it("logs in and returns to the intended internal game screen", async () => {
    signIn.mockResolvedValueOnce({ session: { user: { id: "user-1" } } });
    const view = renderPage("/login?returnTo=%2Fminigames%2Fomok", "login");
    changeInput(view.host.querySelector("#login-email"), "player@example.com");
    changeInput(view.host.querySelector("#login-password"), "secret1");

    await act(async () => view.host.querySelector("form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ));

    expect(signIn).toHaveBeenCalledWith({ email: "player@example.com", password: "secret1" });
    expect(currentLocation.pathname).toBe("/minigames/omok");
    expect(view.host.textContent).toContain("Intended game");
    view.unmount();
  });

  it("rejects an external return URL and lands at home after login", async () => {
    signIn.mockResolvedValueOnce({ session: { user: { id: "user-1" } } });
    const view = renderPage("/login?returnTo=https%3A%2F%2Fattacker.example", "login");
    changeInput(view.host.querySelector("#login-email"), "player@example.com");
    changeInput(view.host.querySelector("#login-password"), "secret1");

    await act(async () => view.host.querySelector("form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ));

    expect(currentLocation.pathname).toBe("/");
    expect(view.host.textContent).toContain("Home");
    view.unmount();
  });

  it("keeps the verified return path in email signup and shows the waiting state", async () => {
    signUp.mockResolvedValueOnce({ session: null, user: { id: "new-user" } });
    const view = renderPage("/signup?returnTo=%2Fminigames%2Fsudoku", "signup");
    changeInput(view.host.querySelector("#signup-email"), "new@example.com");
    changeInput(view.host.querySelector("#signup-password"), "secret1");
    changeInput(view.host.querySelector("#signup-confirm-password"), "secret1");

    await act(async () => view.host.querySelector("form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ));

    expect(signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret1",
      returnTo: "/minigames/sudoku",
    });
    expect(view.host.querySelector('[role="status"]').textContent).toMatch(/인증 링크/);
    expect(currentLocation.pathname).toBe("/signup");
    view.unmount();
  });
});
