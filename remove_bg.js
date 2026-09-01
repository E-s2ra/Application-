const { removeBackground } = require('@imgly/background-removal-node');
const fs = require('fs');
const path = require('path');

async function main() {
    const inputPath = path.join(__dirname, 'assets', 'images', 'icon.png');
    const outputPath = path.join(__dirname, 'assets', 'images', 'icon_transparent.png');
    
    console.log("Removing background...");
    const blob = await removeBackground(inputPath);
    
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log("Done! Saved to", outputPath);
}

main().catch(console.error);
