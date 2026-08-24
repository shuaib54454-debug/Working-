const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, drawFn) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: deflate
  ihdr[11] = 0; // Filter: standard
  ihdr[12] = 0; // Interlace: none
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcPayload = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcPayload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

// Icon drawer: Shuayb Theme (Navy Blue #0f172a with Warm Amber #f59e0b)
function drawSquareIcon(x, y, w, h) {
  const cx = w / 2, cy = h / 2, r = w * 0.42;
  const dist = Math.hypot(x - cx, y - cy);
  const cornerR = w * 0.2;
  const dx = Math.max(Math.abs(x - cx) - (w / 2 - cornerR), 0);
  const dy = Math.max(Math.abs(y - cy) - (h / 2 - cornerR), 0);
  if (Math.hypot(dx, dy) > cornerR) return [0, 0, 0, 0];
  
  if (dist < r) {
    if (dist < r * 0.75) return [245, 158, 11, 255]; // Gold #f59e0b
    return [217, 119, 6, 255]; // Amber ring
  }
  return [15, 23, 42, 255]; // Navy bg #0f172a
}

function drawRoundIcon(x, y, w, h) {
  const cx = w / 2, cy = h / 2, r = w * 0.48;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist > r) return [0, 0, 0, 0];
  if (dist < r * 0.7) return [245, 158, 11, 255];
  if (dist < r * 0.9) return [217, 119, 6, 255];
  return [15, 23, 42, 255];
}

function drawForeground(x, y, w, h) {
  const cx = w / 2, cy = h / 2, r = w * 0.28;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist < r) {
    if (dist < r * 0.7) return [245, 158, 11, 255];
    return [217, 119, 6, 255];
  }
  return [0, 0, 0, 0];
}

function drawSplash(x, y, w, h) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.2;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist < r) {
    if (dist < r * 0.7) return [245, 158, 11, 255];
    return [217, 119, 6, 255];
  }
  return [15, 23, 42, 255];
}

function generateAssets() {
  const resDir = path.resolve(__dirname, '../android/app/src/main/res');
  if (!fs.existsSync(resDir)) {
    console.log('android res directory not found, skipping.');
    return;
  }

  const mipmaps = {
    'mipmap-mdpi': { icon: 48, fg: 108 },
    'mipmap-hdpi': { icon: 72, fg: 162 },
    'mipmap-xhdpi': { icon: 96, fg: 216 },
    'mipmap-xxhdpi': { icon: 144, fg: 324 },
    'mipmap-xxxhdpi': { icon: 192, fg: 432 }
  };

  for (const [dir, sizes] of Object.entries(mipmaps)) {
    const targetDir = path.join(resDir, dir);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), createPng(sizes.icon, sizes.icon, drawSquareIcon));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), createPng(sizes.icon, sizes.icon, drawRoundIcon));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), createPng(sizes.fg, sizes.fg, drawForeground));
  }

  const drawables = {
    'drawable': [480, 800],
    'drawable-land-mdpi': [480, 320],
    'drawable-land-hdpi': [800, 480],
    'drawable-land-xhdpi': [1280, 720],
    'drawable-land-xxhdpi': [1600, 960],
    'drawable-land-xxxhdpi': [1920, 1280],
    'drawable-port-mdpi': [320, 480],
    'drawable-port-hdpi': [480, 800],
    'drawable-port-xhdpi': [720, 1280],
    'drawable-port-xxhdpi': [960, 1600],
    'drawable-port-xxxhdpi': [1280, 1920]
  };

  for (const [dir, [w, h]] of Object.entries(drawables)) {
    const targetDir = path.join(resDir, dir);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'splash.png'), createPng(w, h, drawSplash));
  }

  console.log('✅ Generated 100% valid Android PNG assets successfully!');
}

generateAssets();
