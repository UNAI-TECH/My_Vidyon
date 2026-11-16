const fs = require('fs');
const { PNG } = require('pngjs');

const content = fs.readFileSync('assets/Untitled design (2).svg', 'utf8');
const startTag = 'xlink:href="data:image/png;base64,';
const startIdx = content.indexOf(startTag);
if (startIdx !== -1) {
  const endIdx = content.indexOf('"', startIdx + startTag.length);
  const base64Data = content.substring(startIdx + startTag.length, endIdx);
  const buf = Buffer.from(base64Data, 'base64');
  console.log('Found embedded PNG, length:', buf.length);
  new PNG().parse(buf, function(err, data) {
    if (err) console.error(err);
    else {
      console.log('Embedded PNG dimensions:', data.width, 'x', data.height);
      let minX = data.width, maxX = 0, minY = data.height, maxY = 0;
      for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
          let idx = (data.width * y + x) << 2;
          if (data.data[idx+3] > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      console.log('Embedded bbox:', { minX, maxX, minY, maxY }, 'size:', maxX - minX + 1, 'x', maxY - minY + 1);
    }
  });
}
