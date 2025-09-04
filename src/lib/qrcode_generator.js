/**
 * QR code generator module: wires up encoding, error correction, masking, and layout
 */

import * as Utils from './qrcode_utils.js';
import * as Base from './qrcode_base.js';
import * as Constants from './qrcode_constants.js';
import { DataOverflowError } from './qrcode_exceptions.js';


/**
 * Convenience functions
 */
/**
 * Convenience function: generate raw module matrix from data
 */
/**
 * Generate a 2D boolean module matrix for the given data.
 * Uses the 'qrcode' package under the hood.
 */
import { QRData, createData } from './qrcode_encoder.js';
import { BitMatrix } from './qrcode_utils.js';
// Generates the raw codeword bytes for the given data
function generate(data, options = {}) {
  // Select version and error correction level
  let version = options.version || 1;
  const errorCorrection = options.errorCorrection ?? Constants.ERROR_CORRECT_M;
  const explicitMask = options.maskPattern != null;
  let maskPattern = options.maskPattern;
  let codewords;
  const qrData = new QRData(data);
  if (options.version) {
    // Manual version selection
    codewords = createData(version, errorCorrection, [qrData]);
  } else {
    // Automatic version selection
    let fit = false;
    for (version = 1; version <= 40; version++) {
      try {
        codewords = createData(version, errorCorrection, [qrData]);
        fit = true;
        break;
      } catch (e) {
        if (e instanceof DataOverflowError) continue;
        throw e;
      }
    }
    if (!fit) throw new DataOverflowError('Data too large for any QR version');
  }

  // Matrix size
  const modulesCount = version * 4 + 17;
  const matrix = new BitMatrix(modulesCount);

  // Helper: setup 7x7 position probe pattern at (row, col)
  function setupPositionProbePattern(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= modulesCount || cc < 0 || cc >= modulesCount) continue;
        const isDark = (r >= 0 && r <=6 && (c ===0 || c===6)) || (c>=0 && c<=6 && (r===0||r===6)) || (r>=2&&r<=4&&c>=2&&c<=4);
        matrix.set(cc, rr, isDark, true);
      }
    }
  }

  // Place the three finder patterns
  setupPositionProbePattern(0, 0);
  setupPositionProbePattern(modulesCount - 7, 0);
  setupPositionProbePattern(0, modulesCount - 7);

  // Alignment patterns (positions)
  const positions = Utils.patternPosition(version);
  for (const row of positions) {
    for (const col of positions) {
      // skip if overlapping finder
      if ((row === 6 && col === 6) || (row === 6 && col === modulesCount-7) || (row === modulesCount-7 && col ===6)) continue;
      // draw 5x5 alignment pattern
      for (let r = -2; r <=2; r++) {
        for (let c = -2; c <=2; c++) {
          const isDark = (Math.abs(r)===2 || Math.abs(c)===2 || (r===0 && c===0));
          matrix.set(col+c, row+r, isDark, true);
        }
      }
    }
  }

  // Timing pattern
  for (let i = 8; i < modulesCount - 8; i++) {
    if (!matrix.isReserved(i, 6)) matrix.set(i, 6, i % 2 === 0, true);
    if (!matrix.isReserved(6, i)) matrix.set(6, i, i % 2 === 0, true);
  }

  // Reserve format info areas
  for (let i = 0; i < 9; i++) {
    matrix.reserved[8][i] = true;
    matrix.reserved[i][8] = true;
  }
  for (let i = modulesCount - 8; i < modulesCount; i++) {
    matrix.reserved[8][i] = true;
    matrix.reserved[i][8] = true;
  }
  matrix.reserved[modulesCount - 8][8] = true;

  // Reserve version info areas (for v >= 7)
  // ...not implemented for v < 7...

  // Data mapping: zig-zag per QR spec, skipping reserved
  const dataBits = [];
  for (const b of codewords) for (let i = 7; i >= 0; i--) dataBits.push(((b >> i) & 1) === 1);
  let bitIndex = 0;
  let inc = -1;
  let row = modulesCount - 1;
  for (let col = modulesCount - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (!matrix.isReserved(x, row) && bitIndex < dataBits.length) {
          matrix.set(x, row, dataBits[bitIndex++], false);
        }
      }
      row += inc;
      if (row < 0 || row >= modulesCount) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }

  // Automatic mask selection if not specified
  if (!explicitMask) {
    let bestScore = Infinity;
    let bestMask = 0;
    for (let mask = 0; mask < 8; mask++) {
      const temp = matrix.clone();
      temp.forEach((x, y, val, reserved) => {
        if (!reserved && val != null) {
          const masked = Utils.maskFunc(mask)(y, x) ? !val : val;
          temp.set(x, y, masked, false);
        }
      });
      const score = Utils.lostPoint(temp.data);
      if (score < bestScore) {
        bestScore = score;
        bestMask = mask;
      }
    }
    maskPattern = bestMask;
  }

  // Apply mask
  matrix.forEach((x, y, val, reserved) => {
    if (!reserved && val != null) {
      const masked = Utils.maskFunc(maskPattern)(y, x) ? !val : val;
      matrix.set(x, y, masked, false);
    }
  });

  // Setup format info bits
  const formatInfo = Utils.bchTypeInfo((errorCorrection << 3) | maskPattern);
  // vertical format info
  for (let i = 0; i < 15; i++) {
    const bit = ((formatInfo >> i) & 1) === 1;
    let r, c;
    if (i < 6) {
      r = i; c = 8;
    } else if (i < 8) {
      r = i + 1; c = 8;
    } else {
      r = modulesCount - 15 + i; c = 8;
    }
    matrix.set(c, r, bit, true);
  }
  // horizontal format info
  for (let i = 0; i < 15; i++) {
    const bit = ((formatInfo >> i) & 1) === 1;
    if (i < 8) {
      matrix.set(modulesCount - 1 - i, 8, bit, true);
    } else if (i < 9) {
      matrix.set(15 - i, 8, bit, true);
    } else {
      matrix.set(15 - i - 1, 8, bit, true);
    }
  }
  // fixed module
  matrix.set(8, modulesCount - 8, true, true);

  // Return final matrix as 2D array
  return matrix.data;
}

export { generate };
