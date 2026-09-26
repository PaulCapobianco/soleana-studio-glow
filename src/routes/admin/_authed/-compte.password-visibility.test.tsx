// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyCurrentPassword } from "@/lib/admin/verify-password";
import { supabase } from "@/integrations/supabase/client";
import { PasswordSection } from "./compte";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() },
}));
vi.mock("@/lib/admin/verify-password", () => ({
  verifyCurrentPassword: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
      reauthenticate: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyCurrentPassword).mockResolvedValue(true);
  vi.mocked(supabase.auth.updateUser).mockResolvedValue({ error: null } as never);
});

afterEach(() => {
  cleanup();
});

describe("PasswordSection — afficher/masquer le mot de passe", () => {
  it("bascule uniquement le type du champ, jamais sa valeur, avec un bouton par champ", async () => {
    const user = userEvent.setup();
    render(<PasswordSection email="admin@soleana.studio" />);

    const currentInput = screen.getByLabelText("Mot de passe actuel") as HTMLInputElement;
    const nextInput = screen.getByLabelText("Nouveau mot de passe") as HTMLInputElement;

    await user.type(currentInput, "MotDePasseActuel1");
    await user.type(nextInput, "UnAutreMotDePasse2");

    expect(currentInput.type).toBe("password");
    expect(nextInput.type).toBe("password");

    const toggles = screen.getAllByRole("button", { name: "Afficher le mot de passe" });
    // Un bouton par champ de mot de passe : actuel, nouveau, confirmation.
    expect(toggles).toHaveLength(3);

    // Bascule le champ "Nouveau mot de passe" (2e bouton) uniquement.
    await user.click(toggles[1]);

    expect(nextInput.type).toBe("text");
    expect(nextInput.value).toBe("UnAutreMotDePasse2"); // valeur inchangée
    expect(currentInput.type).toBe("password"); // les autres champs ne sont pas affectés
    expect(screen.getByRole("button", { name: "Masquer le mot de passe" })).not.toBeNull();
  });
});
