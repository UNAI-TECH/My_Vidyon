const fs = require('fs');
const { PNG } = require('pngjs');

// Read mono
const monoBuf = fs.readFileSync('assets/android-icon-monochrome.png');
new PNG().parse(monoBuf, (err, mono) => {
  if (err) throw err;

  // Bounding box in mono:
  // minX: 684, maxX: 1017, minY: 574, maxY: 981
  // w: 334, h: 408
  const srcMinX = 684;
  const srcMaxX = 1017;
  const srcMinY = 574;
  const srcMaxY = 981;
  const srcW = srcMaxX - srcMinX + 1;
  const srcH = srcMaxY - srcMinY + 1;

  // Target canvas: 600 x 600
  const outW = 600;
  const outH = 600;
  const out = new PNG({ width: outW, height: outH });

  // Target size for emblem:
  // Height 430, width = 430 * (334 / 408) ≈ 352
  const targetH = 430;
  const targetW = Math.round(targetH * (srcW / srcH)); // ~352

  const offsetX = Math.round((outW - targetW) / 2); // ~124
  const offsetY = Math.round((outH - targetH) / 2); // ~85

  // Bilinear interpolation for smooth anti-aliased scaling
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const outIdx = (outW * y + x) << 2;

      // Check if inside target rect
      if (x >= offsetX && x < offsetX + targetW && y >= offsetY && y < offsetY + targetH) {
        // Map to src coords
        const gx = ((x - offsetX) / (targetW - 1)) * (srcW - 1) + srcMinX;
        const gy = ((y - offsetY) / (targetH - 1)) * (srcH - 1) + srcMinY;

        const x0 = Math.floor(gx);
        const x1 = Math.min(x0 + 1, srcMaxX);
        const y0 = Math.floor(gy);
        const y1 = Math.min(y0 + 1, srcMaxY);

        const dx = gx - x0;
        const dy = gy - y0;

        const a00 = mono.data[(mono.width * y0 + x0) * 4 + 3];
        const a10 = mono.data[(mono.width * y0 + x1) * 4 + 3];
        const a01 = mono.data[(mono.width * y1 + x0) * 4 + 3];
        const a11 = mono.data[(mono.width * y1 + x1) * 4 + 3];

        const alpha = Math.round(
          a00 * (1 - dx) * (1 - dy) +
          a10 * dx * (1 - dy) +
          a01 * (1 - dx) * dy +
          a11 * dx * dy
        );

        // Android notification icon MUST be white with alpha
        out.data[outIdx] = 255;
        out.data[outIdx + 1] = 255;
        out.data[outIdx + 2] = 255;
        out.data[outIdx + 3] = alpha;
      } else {
        out.data[outIdx] = 0;
        out.data[outIdx + 1] = 0;
        out.data[outIdx + 2] = 0;
        out.data[outIdx + 3] = 0;
      }
    }
  }

  // Check max distance from center (300, 300) for all pixels with alpha > 10
  let maxR = 0;
  let nonZero = 0;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const idx = (outW * y + x) << 2;
      if (out.data[idx + 3] > 10) {
        nonZero++;
        const r = Math.hypot(x - 300, y - 300);
        if (r > maxR) maxR = r;
      }
    }
  }

  console.log('Generated notification icon:');
  console.log('Target emblem size:', targetW, 'x', targetH);
  console.log('Non-zero alpha pixels:', nonZero);
  console.log('Max radius from center:', maxR, 'out of circle radius 300');
  console.log('Fit ratio to circle:', maxR / 300);

  fs.writeFileSync('scratch/test_notification_icon.png', PNG.sync.write(out));
  console.log('Saved to scratch/test_notification_icon.png');
});
