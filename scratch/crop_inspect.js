const fs = require('fs');
const { PNG } = require('pngjs');

// Let's inspect the shapes of the icons
const notifBuf = fs.readFileSync('assets/notification-icon.png');
new PNG().parse(notifBuf, (err, notif) => {
  let minX = notif.width, maxX = 0, minY = notif.height, maxY = 0;
  for (let y = 0; y < notif.height; y++) {
    for (let x = 0; x < notif.width; x++) {
      let idx = (notif.width * y + x) << 2;
      if (notif.data[idx+3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log('notif content bbox:', { minX, maxX, minY, maxY }, 'w:', maxX-minX+1, 'h:', maxY-minY+1);
  
  // Crop the content exactly
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  console.log('Cropped aspect ratio:', cropW / cropH);
});
