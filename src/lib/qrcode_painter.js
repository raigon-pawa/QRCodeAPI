/**
 * QR code painter module: PNG, SVG, and ASCII renderers
 */

import { PNG } from 'pngjs';
// xmlEscape utility (not currently used)
const xmlEscape = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Render modules (2D boolean array) to PNG buffer.
 * Options: boxSize (px), border (modules)
 */
function renderPNG(modules, options = {}) {
  const boxSize = options.boxSize || 10;
  const border = options.border || 4;
  const size = modules.length;
  const pixelSize = (size + border * 2) * boxSize;
  const png = new PNG({ width: pixelSize, height: pixelSize });

  // fill white background
  for (let y = 0; y < pixelSize; y++) {
    for (let x = 0; x < pixelSize; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx    ] = 255;
      png.data[idx + 1] = 255;
      png.data[idx + 2] = 255;
      png.data[idx + 3] = 255;
    }
  }

  // draw modules
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        const x0 = (border + c) * boxSize;
        const y0 = (border + r) * boxSize;
        for (let dy = 0; dy < boxSize; dy++) {
          for (let dx = 0; dx < boxSize; dx++) {
            const x = x0 + dx;
            const y = y0 + dy;
            const idx = (png.width * y + x) << 2;
            png.data[idx    ] = 0;
            png.data[idx + 1] = 0;
            png.data[idx + 2] = 0;
            png.data[idx + 3] = 255;
          }
        }
      }
    }
  }

  return PNG.sync.write(png);
}

/**
 * Render modules to SVG string.
 * Options: boxSize (px), border (modules), color (fill)
 */
function renderSVG(modules, options = {}) {
  const boxSize = options.boxSize || 10;
  const border = options.border || 4;
  const fill = options.color || '#000';
  const size = modules.length;
  const dimension = (size + border * 2) * boxSize;
  let svg = '';
  svg += `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${dimension}\" height=\"${dimension}\" shape-rendering=\"crispEdges\">`;
  svg += `<rect width=\"100%\" height=\"100%\" fill=\"#FFF\"/>`;
  modules.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) {
        const x = (border + c) * boxSize;
        const y = (border + r) * boxSize;
        svg += `<rect x=\"${x}\" y=\"${y}\" width=\"${boxSize}\" height=\"${boxSize}\" fill=\"${fill}\"/>`;
      }
    });
  });
  svg += '</svg>';
  return svg;
}

/**
 * Render modules to ASCII string for terminal.
 * Options: boxSize (characters), border (modules), black (string), white (string)
 */
function renderASCII(modules, options = {}) {
  const boxSize = options.boxSize || 1;
  const border = options.border || 0;
  
  // Default to ANSI colored backgrounds for proper square ratio in terminals
  const black = options.black || '\x1b[40m  \x1b[0m'; // black background + 2 spaces + reset
  const white = options.white || '\x1b[47m  \x1b[0m'; // white background + 2 spaces + reset
  
  const size = modules.length;
  const rows = [];
  
  // Check if using single characters (for half-block mode)
  const isHalf = black.length === 1 && white.length === 1;
  // Check if using ANSI colors (contains escape sequences)
  const isANSI = black.includes('\x1b') || white.includes('\x1b');
  
    // ANSI mode: use background colors for perfect squares
    for (let r = -border; r < size + border; r++) {
      const rowChars = [];
      for (let c = -border; c < size + border; c++) {
        const cell = (r < 0 || c < 0 || r >= size || c >= size) ? false : modules[r][c];
        // For ANSI mode, don't repeat the escape sequences, just add more spaces
        if (cell) {
          rowChars.push(boxSize === 1 ? black : '\x1b[40m' + '  '.repeat(boxSize) + '\x1b[0m');
        } else {
          rowChars.push(boxSize === 1 ? white : '\x1b[47m' + '  '.repeat(boxSize) + '\x1b[0m');
        }
      }
      
      const line = rowChars.join('');
      
      // Apply vertical scaling
      for (let v = 0; v < boxSize; v++) {
        rows.push(line);
      }
    } 
  
  return rows.join('\n');
}

export { renderPNG, renderSVG, renderASCII };
