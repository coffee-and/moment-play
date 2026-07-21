// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import darkLogo from "../../assets/brand/moment-play-logo-dark.webp";
import lightLogo from "../../assets/brand/moment-play-logo-light.webp";
import { Brand } from "./Brand.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderBrand(variant) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter>
      <Brand variant={variant} />
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Brand", () => {
  it("uses the light-theme logo by default", () => {
    const view = renderBrand();
    const link = view.host.querySelector(".brand");
    const logo = view.host.querySelector(".brand-logo");

    expect(link?.getAttribute("aria-label")).toBe("Moment Play 홈으로");
    expect(link?.getAttribute("data-variant")).toBe("light");
    expect(logo?.getAttribute("src")).toBe(lightLogo);
    expect(logo?.getAttribute("alt")).toBe("");
    view.unmount();
  });

  it("uses the dark-theme logo when requested", () => {
    const view = renderBrand("dark");
    const link = view.host.querySelector(".brand");
    const logo = view.host.querySelector(".brand-logo--dark-theme");

    expect(link?.getAttribute("data-variant")).toBe("dark");
    expect(logo?.getAttribute("src")).toBe(darkLogo);
    view.unmount();
  });

  it("keeps both logo variants mounted to prevent a theme-switch loading flash", () => {
    const view = renderBrand();

    expect(view.host.querySelector(".brand-logo--light-theme")?.getAttribute("src")).toBe(lightLogo);
    expect(view.host.querySelector(".brand-logo--dark-theme")?.getAttribute("src")).toBe(darkLogo);
    expect(view.host.querySelectorAll(".brand-logo")).toHaveLength(2);
    view.unmount();
  });
});
