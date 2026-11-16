const fs = require('fs');
const { PNG } = require('pngjs');

const monoBuf = fs.readFileSync('assets/android-icon-monochrome.png');
new PNG().parse(monoBuf, (err, mono) => {
  let minX = 684, maxX = 1017, minY = 574, maxY = 981;
  let nonZeroCount = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let idx = (mono.width * y + x) << 2;
      if (mono.data[idx+3] > 10) nonZeroCount++;
    }
  }
  console.log('Non-zero alpha pixels in mono bounding box:', nonZeroCount);
});
