const Jimp = require('jimp');

async function createTransparentSplash() {
  const image = new Jimp(1, 1, 0x00000000); // 1x1 fully transparent
  await image.writeAsync('./assets/images/transparent-splash.png');
  console.log('Created transparent-splash.png');
}

createTransparentSplash();
