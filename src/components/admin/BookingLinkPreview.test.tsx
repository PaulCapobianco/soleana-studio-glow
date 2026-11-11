// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookingLinkPreview } from "./BookingLinkPreview";

afterEach(() => cleanup());

describe("BookingLinkPreview", () => {
  it("montre le bouton et ouvre le lien Pelli dans un nouvel onglet, sans fuite du référent", () => {
    render(
      <BookingLinkPreview url=" https://soleana-studio.pelli.io/booking/noel " label="Réserver" />,
    );
    const link = screen.getByRole("link", { name: /Réserver/ });
    expect(link.getAttribute("href")).toBe("https://soleana-studio.pelli.io/booking/noel");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });
  it.each([
    "",
    "   ",
    "http://soleana-studio.pelli.io/x",
    "https://evil.example/x",
    "javascript:alert(1)",
  ])("n'affiche rien pour %j (l'erreur de validation s'en charge)", (url) => {
    render(<BookingLinkPreview url={url} label="Réserver" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
