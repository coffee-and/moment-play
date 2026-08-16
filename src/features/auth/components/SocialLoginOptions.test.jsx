// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const signInWithProvider = vi.fn();
let auth = {
  providers: ["google"],
  signInWithProvider,
};

vi.mock("../../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));

const { SocialLoginOptions } = await import("./SocialLoginOptions.jsx");

function renderOptions(returnTo = "/friends") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<SocialLoginOptions returnTo={returnTo} />);
  });
  return {
    host,
    unmount: () => act(() => root.unmount()),
  };
}

function buttonNamed(host, name) {
  return Array.from(host.querySelectorAll("button"))
    .find((button) => button.textContent.includes(name));
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  auth = {
    providers: ["google"],
    signInWithProvider,
  };
});

describe("SocialLoginOptions", () => {
  it("starts the selected provider and preserves the intended return path", async () => {
    signInWithProvider.mockResolvedValueOnce({ provider: "google" });
    const view = renderOptions("/minigames/omok");

    await act(async () => buttonNamed(view.host, "Google").click());

    expect(signInWithProvider).toHaveBeenCalledWith("google", {
      returnTo: "/minigames/omok",
    });
    view.unmount();
  });

  it("prevents duplicate OAuth requests while the first request is pending", async () => {
    let resolveRequest;
    signInWithProvider.mockReturnValueOnce(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    const view = renderOptions();
    const googleButton = buttonNamed(view.host, "Google");

    act(() => {
      googleButton.click();
      googleButton.click();
    });

    expect(signInWithProvider).toHaveBeenCalledTimes(1);
    await act(async () => resolveRequest({ provider: "google" }));
    view.unmount();
  });

  it("shows a recoverable error and allows a retry", async () => {
    signInWithProvider.mockRejectedValueOnce(new Error("로그인이 취소되었습니다."));
    const view = renderOptions();

    await act(async () => buttonNamed(view.host, "Google").click());

    expect(view.host.querySelector('[role="alert"]').textContent).toMatch(/취소/);
    expect(buttonNamed(view.host, "Google").disabled).toBe(false);
    view.unmount();
  });
});
