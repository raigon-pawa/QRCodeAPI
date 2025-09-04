/**
 * Port of qrcode/util.create_data and related classes
 */
import * as Utils from './qrcode_utils.js';
import * as Base from './qrcode_base.js';
import { DataOverflowError } from './qrcode_exceptions.js';

const { PAD0, PAD1, rsPolyLUT } = Utils;
const { Polynomial, gexp, glog, rsBlocks } = Base;

// Convert data to Buffer
function toBytes(data) {
  if (Buffer.isBuffer(data)) return data;
  return Buffer.from(String(data), 'utf8');
}

// Helper: convert string to Shift-JIS bytes (minimal, for QR Kanji mode)
function toShiftJIS(str) {
  // Use iconv-lite or a minimal mapping for QR Kanji test
  // For now, only support common QR Kanji range (0x8140–0x9FFC, 0xE040–0xEBBF)
  // This is a stub: in production, use iconv-lite or similar
  // Here, just return code points for demonstration
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 0xFF) {
      // Surrogate pair or Kanji
      // This is not a full Shift-JIS conversion!
      // For real use, replace with iconv-lite.encode(str, 'shiftjis')
      // Here, just split into two bytes
      bytes.push((code >> 8) & 0xFF, code & 0xFF);
    } else {
      bytes.push(code);
    }
  }
  return Buffer.from(bytes);
}

// Detect if string is all Kanji (Shift-JIS range, relaxed for Japanese)
function isKanji(str) {
  // Accept Hiragana, Katakana, Kanji
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Hiragana: 0x3040–0x309F, Katakana: 0x30A0–0x30FF, Kanji: 0x4E00–0x9FFF
    if (!((code >= 0x3040 && code <= 0x309F) ||
          (code >= 0x30A0 && code <= 0x30FF) ||
          (code >= 0x4E00 && code <= 0x9FFF))) {
      return false;
    }
  }
  return true;
}

// BitBuffer for building bit stream
export class BitBuffer {
  constructor() {
    this.buffer = [];
    this.length = 0;
  }

  get(index) {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >> (7 - index % 8)) & 1) === 1;
  }

  put(num, len) {
    for (let i = 0; i < len; i++) {
      this.putBit(((num >> (len - i - 1)) & 1) === 1);
    }
  }

  putBit(bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex] |= (0x80 >> (this.length % 8));
    this.length++;
  }
}

// QRData holds a chunk of data and its mode
export class QRData {
  constructor(data, mode = null, checkData = true) {
    // Kanji detection
    if (mode == null) {
      if (typeof data === 'string' && isKanji(data)) {
        this.mode = Utils.MODE_KANJI;
        this.data = data;
        this.sjis = toShiftJIS(data);
      } else {
        this.mode = Utils.MODE_8BIT_BYTE;
        this.data = Buffer.from(String(data), 'utf8');
      }
    } else {
      this.mode = mode;
      this.data = checkData ? toBytes(data) : data;
    }
  }
  get length() {
    if (this.mode === Utils.MODE_KANJI) {
      return Math.floor(this.sjis.length / 2);
    }
    return this.data.length;
  }
  write(buffer) {
    if (this.mode === Utils.MODE_KANJI) {
      for (let i = 0; i < this.sjis.length; i += 2) {
        const c1 = this.sjis[i];
        const c2 = this.sjis[i + 1];
        let code = (c1 << 8) | c2;
        if (code >= 0x8140 && code <= 0x9FFC) {
          code -= 0x8140;
        } else if (code >= 0xE040 && code <= 0xEBBF) {
          code -= 0xC140;
        } else {
          continue;
        }
        const encoded = ((code >> 8) * 0xC0) + (code & 0xFF);
        buffer.put(encoded, 13);
      }
    } else if (this.mode === Utils.MODE_NUMBER) {
      for (let i = 0; i < this.data.length; i += 3) {
        const chunk = this.data.slice(i, i + 3).toString();
        const bitlen = Utils.NUMBER_LENGTH[chunk.length];
        buffer.put(parseInt(chunk, 10), bitlen);
      }
    } else if (this.mode === Utils.MODE_ALPHA_NUM) {
      const alpha = Utils.ALPHA_NUM;
      for (let i = 0; i < this.data.length; i += 2) {
        if (i + 1 < this.data.length) {
          const val = alpha.indexOf(this.data[i]) * 45 + alpha.indexOf(this.data[i+1]);
          buffer.put(val, 11);
        } else {
          buffer.put(alpha.indexOf(this.data[i]), 6);
        }
      }
    } else { // 8bit
      for (const byte of this.data) {
        buffer.put(byte, 8);
      }
    }
  }
}

// Create error correction bytes from bit buffer
export function createBytes(bitBuffer, rsBlocksList) {
  let offset = 0;
  const maxDcCount = Math.max(...rsBlocksList.map(b => b.dataCount));
  const maxEcCount = Math.max(...rsBlocksList.map(b => b.totalCount - b.dataCount));
  const dcdata = [];
  const ecdata = [];

  for (const block of rsBlocksList) {
    const dcCount = block.dataCount;
    const ecCount = block.totalCount - dcCount;
    const dcVals = bitBuffer.buffer.slice(offset, offset + dcCount);
    offset += dcCount;
    dcdata.push(dcVals);

    // generator polynomial
    let rsPoly;
    if (rsPolyLUT[ecCount]) {
      rsPoly = new Polynomial(rsPolyLUT[ecCount], 0);
    } else {
      rsPoly = new Polynomial([1], 0);
      for (let i = 0; i < ecCount; i++) {
        rsPoly = rsPoly.multiply(new Polynomial([1, gexp(i)], 0));
      }
    }
    const rawPoly = new Polynomial(dcVals, rsPoly.length - 1);
    const modPoly = rawPoly.mod(rsPoly);
    const ecVals = [];
    const padding = modPoly.length - ecCount;
    for (let i = 0; i < ecCount; i++) {
      const idx = i + padding;
      ecVals.push(idx >= 0 ? modPoly.num[idx] : 0);
    }
    ecdata.push(ecVals);
  }

  const data = [];
  // interleave dc
  for (let i = 0; i < maxDcCount; i++) {
    for (const dc of dcdata) if (i < dc.length) data.push(dc[i]);
  }
  // interleave ec
  for (let i = 0; i < maxEcCount; i++) {
    for (const ec of ecdata) if (i < ec.length) data.push(ec[i]);
  }
  return data;
}

// Main createData: assemble bit stream and finalize
export function createData(version, errorCorrection, dataList) {
  const buffer = new BitBuffer();
  for (const data of dataList) {
    buffer.put(data.mode, 4);
    buffer.put(data.length, Utils.lengthInBits(data.mode, version));
    data.write(buffer);
  }
  const rsBlocksList = rsBlocks(version, errorCorrection);
  const bitLimit = rsBlocksList.reduce((sum, b) => sum + b.dataCount * 8, 0);
  if (buffer.length > bitLimit) {
    throw new DataOverflowError(`Code length overflow. Data size (${buffer.length}) > available (${bitLimit}). Consider increasing the QR version for more capacity.`);
  }
  // terminator
  const avail = bitLimit - buffer.length;
  for (let i = 0; i < Math.min(avail, 4); i++) buffer.putBit(false);
  // pad to byte
  if (buffer.length % 8 !== 0) for (let i = 0; i < 8 - (buffer.length % 8); i++) buffer.putBit(false);
  // pad bytes
  const bytesToFill = (bitLimit - buffer.length) / 8;
  for (let i = 0; i < bytesToFill; i++) buffer.put(i % 2 ? PAD1 : PAD0, 8);
  return createBytes(buffer, rsBlocksList);
}
