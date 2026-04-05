/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { getFirstVisibleTourTarget, isTourTargetVisible } from "@/lib/help/tour-targets";

describe("tour-targets", () => {
  it("getFirstVisibleTourTarget skips desktop nav when hidden (mobile layout)", () => {
    document.body.innerHTML = `
      <aside style="display: none;">
        <nav data-tour="nav-main"><a href="/dashboard">Home</a></nav>
      </aside>
      <header>
        <div data-tour="nav-main" id="mobile-nav"><button type="button">Menu</button></div>
      </header>
    `;
    const el = getFirstVisibleTourTarget('[data-tour="nav-main"]');
    expect(el?.id).toBe("mobile-nav");
  });

  it("getFirstVisibleTourTarget uses desktop nav when aside is visible", () => {
    document.body.innerHTML = `
      <aside style="display: block;">
        <nav data-tour="nav-main" id="desktop-nav"><a href="/dashboard">Home</a></nav>
      </aside>
      <header>
        <div data-tour="nav-main" style="display: none;"><button type="button">Menu</button></div>
      </header>
    `;
    const el = getFirstVisibleTourTarget('[data-tour="nav-main"]');
    expect(el?.id).toBe("desktop-nav");
  });

  it("isTourTargetVisible is false when any ancestor is display none", () => {
    document.body.innerHTML = `<div id="wrap" style="display: none;"><span id="inner">x</span></div>`;
    const inner = document.getElementById("inner") as HTMLElement;
    expect(isTourTargetVisible(inner)).toBe(false);
  });
});
