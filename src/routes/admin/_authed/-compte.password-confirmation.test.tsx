// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { verifyCurrentPassword } from "@/lib/admin/verify-password";
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

const EMAIL = "admin@soleana.studio";
const CURRENT = "MotDePasseActuel1";
const NEXT = "UnAutreMotDePasse2";

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  {
    current = CURRENT,
    next = NEXT,
    confirm = NEXT,
  }: { current?: string; next?: string; confirm?: string } = {},
) {
  await user.type(screen.getByLabelText("Mot de passe actuel"), current);
  await user.type(screen.getByLabelText("Nouveau mot de passe"), next);
  await user.type(screen.getByLabelText("Confirmer le nouveau mot de passe"), confirm);
  await user.click(screen.getByRole("button", { name: "Changer le mot de passe" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyCurrentPassword).mockResolvedValue(true);
  vi.mocked(supabase.auth.updateUser).mockResolvedValue({ error: null } as never);
});

afterEach(() => {
  cleanup();
});

describe("PasswordSection — confirmation du nouveau mot de passe", () => {
  it("rend bien le champ identifiant caché avant les champs de mot de passe", () => {
    const { container } = render(<PasswordSection email={EMAIL} />);
    const hidden = container.querySelector<HTMLInputElement>('input[name="username"]');
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe(EMAIL);
    // Le champ caché ne doit pas être trouvable comme "Nouveau mot de passe" ou sa confirmation :
    // ce sont bien deux champs distincts, avec leurs propres label/id.
    expect(screen.getByLabelText("Nouveau mot de passe")).not.toBe(hidden);
    expect(screen.getByLabelText("Confirmer le nouveau mot de passe")).not.toBe(hidden);
  });

  it("accepte deux mots de passe identiques (champ identifiant caché présent), sans erreur de confirmation", async () => {
    const user = userEvent.setup();
    render(<PasswordSection email={EMAIL} />);

    await fillForm(user, { next: NEXT, confirm: NEXT });

    await waitFor(() => expect(verifyCurrentPassword).toHaveBeenCalledWith(EMAIL, CURRENT));
    expect(toast.error).not.toHaveBeenCalledWith("Les deux mots de passe ne correspondent pas.");
  });

  it("refuse deux mots de passe différents, sans appeler verifyCurrentPassword", async () => {
    const user = userEvent.setup();
    render(<PasswordSection email={EMAIL} />);

    await fillForm(user, { next: NEXT, confirm: "UnTroisiemeMdp4" });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Les deux mots de passe ne correspondent pas."),
    );
    expect(verifyCurrentPassword).not.toHaveBeenCalled();
  });
});
