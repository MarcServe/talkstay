// Generates TalkStay PWA icons (no external image deps — pure Node + zlib).
// Purple brand tile with a white microphone glyph, drawn analytically.
import zlib from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/icons");
mkdirSync(OUT, { recursive: true });

const BRAND = [0x7c, 0x3a, 0xed]; // #7c3aed
const WHITE = [0xff, 0xff, 0xff];

// CRC32
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
};

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  const S = size;
  const cx = S * 0.5;

  // rounded-rect (capsule) test
  const inRoundRect = (x, y, x0, y0, x1, y1, rad) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const rx = Math.min(rad, (x1 - x0) / 2), ry = Math.min(rad, (y1 - y0) / 2);
    const dx = x < x0 + rx ? x0 + rx - x : x > x1 - rx ? x - (x1 - rx) : 0;
    const dy = y < y0 + ry ? y0 + ry - y : y > y1 - ry ? y - (y1 - ry) : 0;
    return dx * dx + dy * dy <= Math.min(rx, ry) ** 2 || (dx === 0 || dy === 0);
  };

  // Mic geometry
  const capTop = S * 0.28, capBot = S * 0.56, capHalf = S * 0.11;
  const cradleR = S * 0.185, cradleCX = cx, cradleCY = S * 0.47, cradleW = S * 0.03;
  const stemX0 = cx - S * 0.015, stemX1 = cx + S * 0.015, stemY0 = S * 0.64, stemY1 = S * 0.72;
  const baseY0 = S * 0.72, baseY1 = S * 0.75, baseHalf = S * 0.10;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // brand background, full bleed
      let col = BRAND, a = 255;

      // mic capsule
      if (inRoundRect(x, y, cx - capHalf, capTop, cx + capHalf, capBot, capHalf)) col = WHITE;

      // cradle: lower half of an annulus hugging the capsule
      const d = Math.hypot(x - cradleCX, y - cradleCY);
      if (y > cradleCY && d < cradleR && d > cradleR - cradleW) col = WHITE;

      // stem + base
      if (x >= stemX0 && x <= stemX1 && y >= stemY0 && y <= stemY1) col = WHITE;
      if (inRoundRect(x, y, cx - baseHalf, baseY0, cx + baseHalf, baseY1, S * 0.015)) col = WHITE;

      set(x, y, col, a);
    }
  }

  // PNG encode (filter 0 per scanline)
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [["icon-192", 192], ["icon-512", 512], ["icon-maskable-512", 512]]) {
  writeFileSync(path.join(OUT, `${name}.png`), drawIcon(size));
  console.log("wrote", `${name}.png`);
}
