// tests/qr_ascii.js
// Generate a "Hello World" QR code and output ASCII art
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from '../qrcode_generator.js';
import { renderASCII } from '../qrcode_painter.js';

// Derive __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  const data = 'ぐれいすれす たーにっしゅど';
  // Use boxSize=1 and double-wide blocks for square modules in most terminals
  const options = { boxSize: 1, border: 2};
  console.log(`Generating ASCII QR code for: ${data}\n`);
  const modules = generate(data, options);
  const ascii = renderASCII(modules, options);
  console.log(ascii);
  // Also write to file
  const outFile = path.join(__dirname, 'hello_world.txt');
  fs.writeFileSync(outFile, ascii);
  console.log(`\nASCII QR code written to ${outFile}`);
}

main();
