/**
 * Port of qrcode/base.py
 */

import { ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H } from './qrcode_constants.js';

// Exponent and Log tables for GF(256)
export const EXP_TABLE = new Array(256);
export const LOG_TABLE = new Array(256);

// initialize tables
for (let i = 0; i < 8; i++) {
  EXP_TABLE[i] = 1 << i;
}
for (let i = 8; i < 256; i++) {
  EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i++) {
  LOG_TABLE[EXP_TABLE[i]] = i;
}

export function glog(n) {
  if (n < 1) throw new Error(`glog(${n})`);
  return LOG_TABLE[n];
}

export function gexp(n) {
  return EXP_TABLE[n % 255];
}

export class Polynomial {
  constructor(num, shift) {
    if (!Array.isArray(num) || num.length === 0) {
      throw new Error(`Invalid Polynomial: ${num}/${shift}`);
    }
    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = num.slice(offset).concat(new Array(shift).fill(0));
  }

  get length() {
    return this.num.length;
  }

  get(i) {
    return this.num[i];
  }

  multiply(other) {
    const result = new Array(this.length + other.length - 1).fill(0);
    for (let i = 0; i < this.length; i++) {
      for (let j = 0; j < other.length; j++) {
        result[i + j] ^= gexp(glog(this.num[i]) + glog(other.num[j]));
      }
    }
    return new Polynomial(result, 0);
  }

  mod(other) {
    if (this.length < other.length) {
      return this;
    }
    // Compute factor to align leading terms
    const ratio = glog(this.num[0]) - glog(other.num[0]);
    const modded = [];
    // Apply polynomial long division step
    for (let i = 0; i < this.num.length; i++) {
      if (i < other.num.length) {
        const o = other.num[i];
        // only adjust when other coefficient non-zero
        modded[i] = o !== 0
          ? this.num[i] ^ gexp(glog(o) + ratio)
          : this.num[i];
      } else {
        // copy remaining coefficients
        modded[i] = this.num[i];
      }
    }
    const remainder = new Polynomial(modded, 0);
    // continue reducing if degree still >= divisor
    return remainder.length >= other.length ? remainder.mod(other) : remainder;
  }
}

export class RSBlock {
  constructor(totalCount, dataCount) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }
}

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Load RS block table JSON dynamically
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RS_BLOCK_TABLE = JSON.parse(
  readFileSync(path.join(__dirname, 'rs_block_table.json'), 'utf-8')
);
const RS_BLOCK_OFFSET = {
  [ERROR_CORRECT_L]: 0,
  [ERROR_CORRECT_M]: 1,
  [ERROR_CORRECT_Q]: 2,
  [ERROR_CORRECT_H]: 3
};

export function rsBlocks(version, errorCorrection) {
  const offset = RS_BLOCK_OFFSET[errorCorrection];
  const entry = RS_BLOCK_TABLE[(version - 1) * 4 + offset];
  const blocks = [];
  for (let i = 0; i < entry.length; i += 3) {
    const count = entry[i];
    const totalCount = entry[i+1];
    const dataCount = entry[i+2];
    for (let j = 0; j < count; j++) {
      blocks.push(new RSBlock(totalCount, dataCount));
    }
  }
  return blocks;
}
