const Jimp = require('jimp');
const fs = require('fs');

async function removeBackground(inputPath) {
  console.log('Processing', inputPath);
  const image = await Jimp.read(inputPath);
  
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  
  const visited = new Set();
  const queue = [];
  
  const isWhiteIsh = (x, y) => {
    const hex = image.getPixelColor(x, y);
    const rgb = Jimp.intToRGBA(hex);
    // Be generous to remove all shades of white/light grey off-white anti-aliasing on the edges
    return rgb.r > 230 && rgb.g > 230 && rgb.b > 230 && rgb.a > 0;
  };

  const addQueue = (x, y) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = y * width + x;
      if (!visited.has(idx)) {
        visited.add(idx);
        if (isWhiteIsh(x, y)) {
          queue.push([x, y]);
        }
      }
    }
  };

  addQueue(0, 0);
  addQueue(width - 1, 0);
  addQueue(0, height - 1);
  addQueue(width - 1, height - 1);
  addQueue(Math.floor(width/2), 0);
  addQueue(0, Math.floor(height/2));
  addQueue(Math.floor(width/2), height - 1);
  addQueue(width - 1, Math.floor(height/2));

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    image.setPixelColor(0x00000000, x, y);
    addQueue(x + 1, y);
    addQueue(x - 1, y);
    addQueue(x, y + 1);
    addQueue(x, y - 1);
  }

  await image.writeAsync(inputPath); // overwrite
}

async function run() {
  const files = [
    '../assets/images/icon.png',
    '../assets/images/android-icon-foreground.png',
    '../assets/images/android-icon-foreground-safe.png'
  ];
  for (const f of files) {
    try {
      await removeBackground(f);
      console.log('Success:', f);
    } catch(e) {
      console.log('Error on', f, e.message);
    }
  }
}
run();
