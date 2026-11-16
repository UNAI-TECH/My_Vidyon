const fs = require('fs');
const { PNG } = require('pngjs');

const monoBuf = fs.readFileSync('assets/android-icon-monochrome.png');
new PNG().parse(monoBuf, (err, mono) => {
  let minX = mono.width, maxX = 0, minY = mono.height, maxY = 0;
  for (let y = 0; y < mono.height; y++) {
    for (let x = 0; x < mono.width; x++) {
      let idx = (mono.width * y + x) << 2;
      if (mono.data[idx+3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log('mono content bbox:', { minX, maxX, minY, maxY }, 'w:', maxX-minX+1, 'h:', maxY-minY+1);
  console.log('mono aspect ratio:', (maxX-minX+1) / (maxY-minY+1));
});
