// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ADMIN_GUIDE_SECTIONS } from "@/data/admin-guide";
import { AdminGuide } from "./AdminGuide";

afterEach(() => cleanup());

describe("AdminGuide", () => {
  it("affiche une rubrique par section, avec étapes numérotées et sommaire cliquable", () => {
    render(<AdminGuide />);
    expect(screen.getByRole("heading", { level: 1, name: "Aide" })).toBeTruthy();
    const toc = screen.getByRole("navigation", { name: "Sommaire de l'aide" });
    for (const section of ADMIN_GUIDE_SECTIONS) {
      expect(within(toc).getByRole("link", { name: section.title }).getAttribute("href")).toBe(
        `#${section.id}`,
      );
      const block = document.getElementById(section.id)!;
      expect(within(block).getByRole("heading", { level: 2, name: section.title })).toBeTruthy();
      expect(block.querySelectorAll("ol > li")).toHaveLength(section.steps.length);
    }
  });
  it("indique à qui s'adresser", () => {
    render(<AdminGuide />);
    expect(screen.getByText("À qui m'adresser ?")).toBeTruthy();
    expect(screen.getAllByText(/Paul/).length).toBeGreaterThan(0);
  });
});
