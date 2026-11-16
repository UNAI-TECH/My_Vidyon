const fs = require('fs');
const { PNG } = require('pngjs');

const monoBuf = fs.readFileSync('assets/android-icon-monochrome.png');
const notifBuf = fs.readFileSync('assets/notification-icon.png');

new PNG().parse(monoBuf, (err, mono) => {
  new PNG().parse(notifBuf, (err, notif) => {
    // Generate ASCII for mono crop
    let outMono = 'MONO:\n';
    const minXm = 684, maxXm = 1017, minYm = 574, maxYm = 981;
    const wm = maxXm - minXm + 1;
    const hm = maxYm - minYm + 1;
    for (let y = 0; y < 25; y++) {
      for (let x = 0; x < 25; x++) {
        const srcX = Math.floor(minXm + (x / 24) * (wm - 1));
        const srcY = Math.floor(minYm + (y / 24) * (hm - 1));
        const idx = (mono.width * srcY + srcX) << 2;
        outMono += mono.data[idx+3] > 128 ? '#' : ' ';
      }
      outMono += '\n';
    }
    
    // Generate ASCII for notif crop
    let outNotif = 'NOTIF:\n';
    const minXn = 247, maxXn = 367, minYn = 207, maxYn = 353;
    const wn = maxXn - minXn + 1;
    const hn = maxYn - minYn + 1;
    for (let y = 0; y < 25; y++) {
      for (let x = 0; x < 25; x++) {
        const srcX = Math.floor(minXn + (x / 24) * (wn - 1));
        const srcY = Math.floor(minYn + (y / 24) * (hn - 1));
        const idx = (notif.width * srcY + srcX) << 2;
        outNotif += notif.data[idx+3] > 128 ? '#' : ' ';
      }
      outNotif += '\n';
    }

    console.log(outMono);
    console.log(outNotif);
  });
});
