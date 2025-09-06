// tests/qr_png.js
// Simple example: generate a "Hello World" QR code and write to PNG
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from '../qrcode_generator.js';
import { renderPNG } from '../qrcode_painter.js';
import { version } from 'os';

function main() {
  const data = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam elit libero, pellentesque eget rhoncus eu, maximus sit amet mauris. Nam diam elit, varius id scelerisque at, facilisis non turpis. Vestibulum sit amet nunc ut eros fermentum iaculis id fringilla diam. Sed dapibus gravida consequat. Aliquam sit amet finibus tortor. Mauris.';
  const options = { boxSize: 10, border: 4 };
  console.log(`Generating QR code for: ${data}`);
  const modules = generate(data, options);
  const pngBuffer = renderPNG(modules, options);
  const outFile = path.join(__dirname, 'hello_world.png');
  fs.writeFileSync(outFile, pngBuffer);
  console.log(`QR code written to ${outFile}`);
}

// Derive __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Execute
main();