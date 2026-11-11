import {
  ACTIVE_PHOTO_QUALITY_PROFILE,
  expectedPhotoWidths,
  PHOTO_QUALITY_PROFILES,
} from "@/lib/photos/quality";

export type BrowserPhotoVariant = {
  blob: Blob;
  format: "avif" | "webp";
  width: number;
  height: number;
  byte_size: number;
  sha256: string;
  storage_path: string;
};

const BROWSER_AVIF_OPTIONS = PHOTO_QUALITY_PROFILES[ACTIVE_PHOTO_QUALITY_PROFILE].avif;
const BROWSER_WEBP_OPTIONS = PHOTO_QUALITY_PROFILES[ACTIVE_PHOTO_QUALITY_PROFILE].webp;

const jpegSignature = (bytes: Uint8Array) =>
  bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
const pngSignature = (bytes: Uint8Array) =>
  bytes.length >= 8 &&
  [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
const heifSignature = (bytes: Uint8Array) => {
  if (bytes.length < 12 || String.fromCharCode(...bytes.subarray(4, 8)) !== "ftyp") return false;
  const brands = String.fromCharCode(...bytes.subarray(8, Math.min(bytes.length, 64)));
  return ["heic", "heix", "mif1", "msf1"].some((brand) => brands.includes(brand));
};

/** Source codecs used here are deliberately limited to camera originals or lossless PNG inputs. */
export async function validatePhotoSource(file: File): Promise<"jpeg" | "png" | "heif"> {
  const acceptedMime = new Set([
    "",
    "application/octet-stream",
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif",
  ]);
  const acceptedName = /\.(jpe?g|png|heic|heif)$/i.test(file.name);
  const genericMime = file.type === "" || file.type === "application/octet-stream";
  if (!acceptedMime.has(file.type.toLowerCase()) || (genericMime && !acceptedName)) {
    throw new Error("Choisissez un original JPG/JPEG, HEIC/HEIF ou PNG.");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("La photo dépasse la limite de 25 Mo.");
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (jpegSignature(bytes)) return "jpeg";
  if (pngSignature(bytes)) return "png";
  if (heifSignature(bytes)) return "heif";
  throw new Error("Le fichier n'est pas un JPG, PNG ou HEIC/HEIF reconnu.");
}

/** Reject browser encoder fallbacks: the MIME type and file signature must both match. */
export async function assertEncodedFormat(blob: Blob, format: "avif" | "webp"): Promise<void> {
  if (blob.type !== `image/${format}`)
    throw new Error(`L'encodeur n'a pas produit de vrai ${format.toUpperCase()}.`);
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const isAvif =
    format === "avif" &&
    String.fromCharCode(...bytes.subarray(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(String.fromCharCode(...bytes.subarray(8, 12)));
  const isWebp =
    format === "webp" &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  if (!isAvif && !isWebp)
    throw new Error(
      `L'encodeur a renvoyé un fichier qui n'est pas au format ${format.toUpperCase()}.`,
    );
}

// Charge l'encodeur mono-thread à la première photo admin. Le point d'entrée général de jSquash
// inclut un worker multithread que le build Vite de ce projet ne peut pas regrouper.
let avifEncoderPromise:
  | Promise<{
      encode: (image: ImageData) => Uint8Array;
    }>
  | undefined;

async function browserAvifEncoder() {
  avifEncoderPromise ??= (async () => {
    const [{ default: createModule }, { default: wasmUrl }, { defaultOptions }] = await Promise.all(
      [
        import("@jsquash/avif/codec/enc/avif_enc.js"),
        import("@jsquash/avif/codec/enc/avif_enc.wasm?url"),
        import("@jsquash/avif/meta.js"),
      ],
    );
    const module = await createModule({ noInitialRun: true, locateFile: () => wasmUrl });
    return {
      encode(image: ImageData) {
        const result = module.encode(new Uint8Array(image.data.buffer), image.width, image.height, {
          ...defaultOptions,
          ...BROWSER_AVIF_OPTIONS,
        });
        if (!result) throw new Error("L'encodage AVIF a échoué.");
        return result;
      },
    };
  })();
  return avifEncoderPromise;
}

let webpEncoderPromise: Promise<{ encode: (image: ImageData) => Uint8Array }> | undefined;

// Use the same WASM encoder in every browser. Native canvas WebP support and quality mapping vary;
// iOS Safari may return PNG when WebP was requested, so native toBlob is not used here.
async function browserWebpEncoder() {
  webpEncoderPromise ??= (async () => {
    const [{ default: createModule }, { default: wasmUrl }, { defaultOptions }] = await Promise.all(
      [
        import("@jsquash/webp/codec/enc/webp_enc.js"),
        import("@jsquash/webp/codec/enc/webp_enc.wasm?url"),
        import("@jsquash/webp/meta.js"),
      ],
    );
    const module = await createModule({ noInitialRun: true, locateFile: () => wasmUrl });
    return {
      encode(image: ImageData) {
        const result = module.encode(image.data, image.width, image.height, {
          ...defaultOptions,
          ...BROWSER_WEBP_OPTIONS,
        });
        if (!result) throw new Error("L'encodage WebP a échoué.");
        return result;
      },
    };
  })();
  return webpEncoderPromise;
}

async function decodePhotoSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Safari's native HEIC decoder can exist without createImageBitmap supporting that input.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(
      "Ce navigateur ne peut pas décoder ce fichier image. Exportez-le en JPG/JPEG depuis Photos ou Fichiers, puis réessayez.",
      { cause: error },
    );
  }
}

/** Réencode dans le navigateur avant tout envoi : orientation appliquée, aucun original transféré. */
export async function generateBrowserPhotoVariants(
  file: File,
  sourceKey: string,
): Promise<BrowserPhotoVariant[]> {
  await validatePhotoSource(file);
  const decoded = await decodePhotoSource(file);
  try {
    if (decoded.width < 1 || decoded.height < 1 || decoded.width * decoded.height > 100_000_000) {
      throw new Error("Les dimensions de cette photo sont trop grandes.");
    }
    const widths = expectedPhotoWidths(decoded.width);
    const [avifEncoder, webpEncoder] = await Promise.all([
      browserAvifEncoder(),
      browserWebpEncoder(),
    ]);
    const variants: BrowserPhotoVariant[] = [];
    for (const width of widths) {
      const height = Math.max(1, Math.round((decoded.height * width) / decoded.width));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" });
      if (!context) throw new Error("Le navigateur ne peut pas traiter cette photo.");
      context.drawImage(decoded.source, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height);
      const avifBlob = new Blob([Uint8Array.from(avifEncoder.encode(pixels))], {
        type: "image/avif",
      });
      const webpBlob = new Blob([Uint8Array.from(webpEncoder.encode(pixels))], {
        type: "image/webp",
      });
      await Promise.all([
        assertEncodedFormat(avifBlob, "avif"),
        assertEncodedFormat(webpBlob, "webp"),
      ]);
      for (const [format, blob] of [
        ["avif", avifBlob],
        ["webp", webpBlob],
      ] as const) {
        const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
        const sha256 = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
        variants.push({
          blob,
          format,
          width,
          height,
          byte_size: blob.size,
          sha256,
          storage_path: `${sourceKey}/${sha256.slice(0, 8)}-${width}.${format}`,
        });
      }
      canvas.width = 0;
      canvas.height = 0;
    }
    return variants;
  } finally {
    decoded.close();
  }
}
