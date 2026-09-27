import { describe, expect, it } from "vitest";
import { assertEncodedFormat, validatePhotoSource } from "@/lib/photo-storage";

const file = (bytes: number[], name: string, type: string) =>
  new File([new Uint8Array(bytes)], name, { type });

describe("validation des entrées et sorties photo", () => {
  it("accepte un JPEG par sa signature", async () => {
    await expect(validatePhotoSource(file([0xff, 0xd8, 0xff, 0, 1], "photo.jpg", "image/jpeg"))).resolves.toBe("jpeg");
  });

  it("accepte un HEIC fixe et refuse un WebP en entrée", async () => {
    await expect(validatePhotoSource(file([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], "photo.heic", "image/heic"))).resolves.toBe("heif");
    await expect(validatePhotoSource(file([0x52, 0x49, 0x46, 0x46], "variant.webp", "image/webp"))).rejects.toThrow("original JPG/JPEG");
  });

  it("reconnaît un original HEIC dont iOS fournit un MIME générique", async () => {
    await expect(validatePhotoSource(file(
      [0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63],
      "photo.HEIC",
      "application/octet-stream",
    ))).resolves.toBe("heif");
  });

  it("ne prend pas un type MIME pour preuve du format WebP", async () => {
    const validWebp = new Blob(["RIFF", new Uint8Array([4, 0, 0, 0]), "WEBP"], { type: "image/webp" });
    await expect(assertEncodedFormat(validWebp, "webp")).resolves.toBeUndefined();
    const pngFallback = new Blob(["RIFF", new Uint8Array([4, 0, 0, 0]), "WEBP"], { type: "image/png" });
    await expect(assertEncodedFormat(pngFallback, "webp")).rejects.toThrow("vrai WEBP");
  });

  it("exige le conteneur AVIF", async () => {
    const avif = new Blob([new Uint8Array([0, 0, 0, 0]), "ftypavif"], { type: "image/avif" });
    await expect(assertEncodedFormat(avif, "avif")).resolves.toBeUndefined();
    const invalid = new Blob(["not-avif"], { type: "image/avif" });
    await expect(assertEncodedFormat(invalid, "avif")).rejects.toThrow("n'est pas au format AVIF");
  });
});
