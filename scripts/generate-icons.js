const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper to write an uncompressed RGBA PNG
function createPng(width, height, colorR, colorG, colorB) {
  function crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[i] = c;
    }
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const combined = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, combined, crc]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Generate raw scanlines
  const lineSize = 1 + width * 4;
  const rawData = Buffer.alloc(lineSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * lineSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Cross pattern calculation
      const midX = width / 2;
      const midY = height / 2;
      const isCross = (Math.abs(x - midX) < width * 0.08 && y > height * 0.15 && y < height * 0.85) ||
                      (Math.abs(y - midY * 0.8) < height * 0.08 && x > width * 0.2 && x < width * 0.8);

      if (isCross) {
        rawData[pxOffset] = 245;     // Gold R
        rawData[pxOffset + 1] = 158; // Gold G
        rawData[pxOffset + 2] = 11;  // Gold B
        rawData[pxOffset + 3] = 255;
      } else {
        // Deep Navy gradient
        rawData[pxOffset] = colorR;
        rawData[pxOffset + 1] = colorG;
        rawData[pxOffset + 2] = colorB;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPng(192, 192, 3, 105, 161));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPng(512, 512, 3, 105, 161));
console.log('PNG icons created successfully.');
