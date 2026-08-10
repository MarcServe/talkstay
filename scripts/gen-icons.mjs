// Generates TalkStay PWA icons from the real brand logo
// (public/marketing/talkstay-logo.png) — not a generic mic glyph.
//
// Requires sharp as a one-off (not a runtime dep):
//   npm i -D sharp && node scripts/gen-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOGO = path.join(ROOT, "public/marketing/talkstay-logo.png");
const OUT = path.join(ROOT, "public/icons");
mkdirSync(OUT, { recursive: true });

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Install sharp to regenerate icons: npm i -D sharp");
  process.exit(1);
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/** Square icon with the TalkStay logo centered on a white tile. */
async function makeIcon(size, padRatio = 0.06) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const resized = await sharp(LOGO)
    .ensureAlpha()
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toBuffer();
}

/** Minimal ICO wrapper around a single PNG (modern browsers accept PNG-in-ICO). */
function pngToIco(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir[0] = size >= 256 ? 0 : size;
  dir[1] = size >= 256 ? 0 : size;
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(pngBuf.length, 8);
  dir.writeUInt32LE(6 + 16, 12);
  return Buffer.concat([header, dir, pngBuf]);
}

const outputs = [
  ["icons/icon-192.png", await makeIcon(192, 0.06)],
  ["icons/icon-512.png", await makeIcon(512, 0.06)],
  // Maskable icons need ~20% safe padding so OS masks don't clip the logo.
  ["icons/icon-maskable-512.png", await makeIcon(512, 0.18)],
  ["icons/apple-touch-icon-180.png", await makeIcon(180, 0.06)],
];

const fav32 = await makeIcon(32, 0.04);
outputs.push(["favicon-32.png", fav32]);
outputs.push(["favicon.ico", pngToIco(fav32, 32)]);

for (const [rel, buf] of outputs) {
  const dest = path.join(ROOT, "public", rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  console.log("wrote", rel, `(${buf.length} bytes)`);
}
