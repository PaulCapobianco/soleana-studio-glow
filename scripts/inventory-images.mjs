// Read local assets and source references only. No environment files or remote APIs.
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`])),
  );
  return groups.flat().sort();
}
const sources = (await walk("src")).filter((p) => /\.(ts|tsx|css)$/.test(p));
const references = [];
for (const source of sources) {
  const text = await readFile(source, "utf8");
  for (const match of text.matchAll(/["']([^"']+\.(?:webp|avif|png|jpe?g|svg|ico))["']/g)) {
    const value = match[1];
    const resolved = value.startsWith("@/")
      ? `src/${value.slice(2)}`
      : value.startsWith(".")
        ? path.normalize(path.join(path.dirname(source), value))
        : value.startsWith("/")
          ? `public${value}`
          : value;
    const pattern = new RegExp(
      `^${resolved
        .split("*")
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^/]*")}$`,
    );
    references.push({
      resolved,
      pattern,
      source,
      line: text.slice(0, match.index).split("\n").length,
    });
  }
}
const assets = [...(await walk("src/assets")), ...(await walk("public"))].filter((p) =>
  /\.(webp|avif|png|jpe?g|svg|ico)$/i.test(p),
);
const rows = [];
for (const file of assets) {
  const bytes = await readFile(file);
  const metadata = await sharp(bytes)
    .metadata()
    .catch(() => ({}));
  const refs = references.filter((r) => r.pattern.test(file)).map((r) => `${r.source}:${r.line}`);
  const identity = /logo|favicon|icon|placeholder|\.svg$/.test(file);
  const christmas = file.includes("/noel-2026/");
  const critical = /hero_|noel-hero|logo/.test(file);
  rows.push({
    file,
    format: metadata.format ?? path.extname(file).slice(1),
    bytes: (await stat(file)).size,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    references: refs,
    critical,
    classification: identity ? "A-local" : christmas || !refs.length ? "C-confirm" : "B-storage",
    source: file,
    originalSource: "Not matched; originals remain outside the repository",
  });
}
await writeFile("docs/image-inventory.json", JSON.stringify(rows, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      files: rows.length,
      bytes: rows.reduce((n, r) => n + r.bytes, 0),
      referenced: rows.filter((r) => r.references.length).length,
      classifications: Object.fromEntries(
        ["A-local", "B-storage", "C-confirm"].map((k) => [
          k,
          rows.filter((r) => r.classification === k).length,
        ]),
      ),
    },
    null,
    2,
  ),
);
