import { describe, expect, it } from "vitest";
import { isPathAllowedWithoutProjects } from "@/lib/dashboard/no-project-gate";

describe("isPathAllowedWithoutProjects", () => {
  it("allows dashboard home and project creation", () => {
    expect(isPathAllowedWithoutProjects("/dashboard")).toBe(true);
    expect(isPathAllowedWithoutProjects("/dashboard/")).toBe(true);
    expect(isPathAllowedWithoutProjects("/dashboard/projects")).toBe(true);
    expect(isPathAllowedWithoutProjects("/dashboard/projects/")).toBe(true);
  });

  it("allows help and account settings", () => {
    expect(isPathAllowedWithoutProjects("/dashboard/help")).toBe(true);
    expect(isPathAllowedWithoutProjects("/dashboard/help?topic=welcome-overview")).toBe(true);
    expect(isPathAllowedWithoutProjects("/dashboard/settings")).toBe(true);
    expect(isPathAllowedWithoutProjects("/dashboard/settings?tab=account")).toBe(true);
  });

  it("blocks regular app tabs until a project exists", () => {
    expect(isPathAllowedWithoutProjects("/dashboard/rooms")).toBe(false);
    expect(isPathAllowedWithoutProjects("/dashboard/planning")).toBe(false);
    expect(isPathAllowedWithoutProjects("/dashboard/finances")).toBe(false);
    expect(isPathAllowedWithoutProjects("/dashboard/projects/abc/settings")).toBe(false);
  });
});
