// tests/qr_svg.js
// Generate a "Hello World" QR code and write to SVG
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from '../qrcode_generator.js';
import { renderSVG } from '../qrcode_painter.js';

// Derive __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  const data = 'ぐれいすれす たーにっしゅど';
  const options = { boxSize: 10, border: 4, color: '#000' };
  console.log(`Generating SVG QR code for: ${data}`);
  const modules = generate(data, options);
  const svgStr = renderSVG(modules, options);
  const outFile = path.join(__dirname, 'hello_world.svg');
  fs.writeFileSync(outFile, svgStr);
  console.log(`SVG QR code written to ${outFile}`);
}

main();
