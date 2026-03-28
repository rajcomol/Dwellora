// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Button from "@/components/ui/Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button type="button">Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeTruthy();
  });
});
