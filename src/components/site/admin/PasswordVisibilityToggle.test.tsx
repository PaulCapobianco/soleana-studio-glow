// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordVisibilityToggle } from "./PasswordVisibilityToggle";

afterEach(() => {
  cleanup();
});

describe("PasswordVisibilityToggle", () => {
  it("affiche le libellé et l'état accessibles d'un mot de passe masqué", () => {
    render(<PasswordVisibilityToggle visible={false} onToggle={() => {}} />);
    const button = screen.getByRole("button", { name: "Afficher le mot de passe" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("affiche le libellé et l'état accessibles d'un mot de passe visible", () => {
    render(<PasswordVisibilityToggle visible={true} onToggle={() => {}} />);
    const button = screen.getByRole("button", { name: "Masquer le mot de passe" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("a une zone cliquable d'au moins 44 px (min-h-11 min-w-11)", () => {
    render(<PasswordVisibilityToggle visible={false} onToggle={() => {}} />);
    const button = screen.getByRole("button");
    expect(button.className).toMatch(/min-h-11/);
    expect(button.className).toMatch(/min-w-11/);
  });

  it("appelle onToggle au clic, sans jamais modifier de valeur (aucun champ ici)", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<PasswordVisibilityToggle visible={false} onToggle={onToggle} />);
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("est un bouton type=button (n'a jamais soumis le formulaire parent)", () => {
    render(<PasswordVisibilityToggle visible={false} onToggle={() => {}} />);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });
});
