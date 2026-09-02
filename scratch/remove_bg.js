// @ts-nocheck
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

async function removeBackground() {
  const inputPath = path.join(__dirname, '../assets/images/icon.png');
  const outputPath = path.join(__dirname, '../assets/images/icon_transparent.png');

  console.log('Loading image...');
  const image = await Jimp.read(inputPath);
  
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  
  // Flood fill algorithm to remove the outer white background.
  // We'll treat (0,0), (width-1, 0), (0, height-1), (width-1, height-1) as seed points.
  // Any pixel connected to these seeds that is "white-ish" will become transparent.
  
  const visited = new Set();
  const queue = [];
  
  const isWhiteIsh = (x, y) => {
    const hex = image.getPixelColor(x, y);
    const rgb = Jimp.intToRGBA(hex);
    // threshold for white (e.g., r > 240, g > 240, b > 240)
    return rgb.r > 240 && rgb.g > 240 && rgb.b > 240 && rgb.a > 0;
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

  // add corners
  addQueue(0, 0);
  addQueue(width - 1, 0);
  addQueue(0, height - 1);
  addQueue(width - 1, height - 1);
  
  // add middle of edges just in case
  addQueue(Math.floor(width/2), 0);
  addQueue(0, Math.floor(height/2));
  addQueue(Math.floor(width/2), height - 1);
  addQueue(width - 1, Math.floor(height/2));

  console.log('Flood filling...');
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    // make transparent
    image.setPixelColor(0x00000000, x, y);
    
    // add neighbors
    addQueue(x + 1, y);
    addQueue(x - 1, y);
    addQueue(x, y + 1);
    addQueue(x, y - 1);
  }

  // Also remove pure white globally just in case flood fill missed disconnected outer regions
  // But wait, the user's logo might contain white. Flood fill is safer!
  
  console.log('Writing image...');
  await image.writeAsync(outputPath);
  console.log('Done!');
}

removeBackground().catch(console.error);
