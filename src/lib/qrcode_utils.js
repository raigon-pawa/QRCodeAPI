/**
 * Port of qrcode/util.py from Python qrcode package
 */

const math = Math;

// QR encoding modes.
const MODE_NUMBER    = 1 << 0;
const MODE_ALPHA_NUM = 1 << 1;
const MODE_8BIT_BYTE = 1 << 2;
const MODE_KANJI     = 1 << 3;

// Encoding mode sizes.
const MODE_SIZE_SMALL = {
  [MODE_NUMBER]:    10,
  [MODE_ALPHA_NUM]:  9,
  [MODE_8BIT_BYTE]:  8,
  [MODE_KANJI]:      8
};
const MODE_SIZE_MEDIUM = {
  [MODE_NUMBER]:    12,
  [MODE_ALPHA_NUM]: 11,
  [MODE_8BIT_BYTE]: 16,
  [MODE_KANJI]:     10
};
const MODE_SIZE_LARGE = {
  [MODE_NUMBER]:    14,
  [MODE_ALPHA_NUM]: 13,
  [MODE_8BIT_BYTE]: 16,
  [MODE_KANJI]:     12
};

// Alphanumeric table
const ALPHA_NUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const RE_ALPHA_NUM = new RegExp(`^[${ALPHA_NUM.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}]*$`);

// Number length bits
const NUMBER_LENGTH = {3: 10, 2: 7, 1: 4};

const PATTERN_POSITION_TABLE = [
  [], [6,18], [6,22], [6,26], [6,30], [6,34], [6,22,38], [6,24,42],
  [6,26,46], [6,28,50], [6,30,54], [6,32,58], [6,34,62], [6,26,46,66],
  [6,26,48,70], [6,26,50,74], [6,30,54,78], [6,30,56,82], [6,30,58,86],
  [6,34,62,90], [6,28,50,72,94], [6,26,50,74,98], [6,30,54,78,102],
  [6,28,54,80,106], [6,32,58,84,110], [6,30,58,86,114], [6,34,62,90,118],
  [6,26,50,74,98,122], [6,30,54,78,102,126], [6,26,52,78,104,130],
  [6,30,56,82,108,134], [6,34,60,86,112,138], [6,30,58,86,114,142],
  [6,34,62,90,118,146], [6,30,54,78,102,126,150], [6,24,50,76,102,128,154],
  [6,28,54,80,106,132,158], [6,32,58,84,110,136,162], [6,26,54,82,110,138,166],
  [6,30,58,86,114,142,170]
];

const G15 = (1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0);
const G18 = (1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0);
const G15_MASK = (1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1);

const PAD0 = 0xEC;
const PAD1 = 0x11;

// rsPoly lookup table: maps ecCount to RS generator polynomial coefficients
const rsPolyLUT = {
  7:  [1, 127, 122, 154, 164, 11,  68, 117],
  10: [1, 216, 194, 159, 111, 199, 94,  95, 113, 157, 193],
  13: [1, 137,  73, 227,  17, 177, 17,  52,  13,  46,  43,  83, 132, 120],
  15: [1,  29, 196, 111, 163, 112, 74,  10, 105, 105, 139, 132, 151,  32, 134,  26],
  16: [1,  59,  13, 104, 189,  68,209,  30,   8, 163,  65,  41, 229,  98,  50,  36,  59],
  17: [1, 119,  66,  83, 120, 119, 22, 197,  83, 249,  41, 143, 134,  85,  53, 125,  99,  79],
  18: [1,239,251,183,113,149,175,199,215,240,220,73,82,173,75,32,67,217,146],
  20: [1,152,185,240,5,111,99,6,220,112,150,69,36,187,22,228,198,121,121,165,174],
  22: [1,89,179,131,176,182,244,19,189,69,40,28,137,29,123,67,253,86,218,230,26,145,245],
  24: [1,122,118,169,70,178,237,216,102,115,150,229,73,130,72,61,43,206,1,237,247,127,217,144,117],
  26: [1,246,51,183,4,136,98,199,152,77,56,206,24,145,40,209,117,233,42,135,68,70,144,146,77,43,94],
  28: [1,252,9,28,13,18,251,208,150,103,174,100,41,167,12,247,56,117,119,233,127,181,100,121,147,176,74,58,197],
  30: [1,212,246,77,73,195,192,75,98,5,70,103,177,22,217,138,51,181,246,72,25,18,46,228,74,216,195,11,106,130,150]
};

// Precompute bit limits: use a function to generate later

function bchDigit(data) {
  let digit = 0;
  while (data !== 0) {
    digit++;
    data >>>= 1;
  }
  return digit;
}

function bchTypeInfo(data) {
  let d = data << 10;
  while (bchDigit(d) - bchDigit(G15) >= 0) {
    d ^= G15 << (bchDigit(d) - bchDigit(G15));
  }
  return ((data << 10) | d) ^ G15_MASK;
}

function bchTypeNumber(data) {
  let d = data << 12;
  while (bchDigit(d) - bchDigit(G18) >= 0) {
    d ^= G18 << (bchDigit(d) - bchDigit(G18));
  }
  return (data << 12) | d;
}

function patternPosition(version) {
  return PATTERN_POSITION_TABLE[version - 1];
}

function maskFunc(pattern) {
  switch (pattern) {
    case 0: return (i, j) => (i + j) % 2 === 0;
    case 1: return (i, j) => i % 2 === 0;
    case 2: return (i, j) => j % 3 === 0;
    case 3: return (i, j) => (i + j) % 3 === 0;
    case 4: return (i, j) => ((Math.floor(i/2) + Math.floor(j/3)) %2) ===0;
    case 5: return (i, j) => ((i*j)%2 + (i*j)%3) === 0;
    case 6: return (i, j) => (((i*j)%2 + (i*j)%3)%2) === 0;
    case 7: return (i, j) => (((i*j)%3 + (i+j)%2)%2) === 0;
    default: throw new TypeError(`Bad mask pattern: ${pattern}`);
  }
}

function modeSizesForVersion(version) {
  if (version < 10) return MODE_SIZE_SMALL;
  if (version < 27) return MODE_SIZE_MEDIUM;
  return MODE_SIZE_LARGE;
}

function lengthInBits(mode, version) {
  if (![MODE_NUMBER, MODE_ALPHA_NUM, MODE_8BIT_BYTE, MODE_KANJI].includes(mode)) {
    throw new TypeError(`Invalid mode (${mode})`);
  }
  checkVersion(version);
  return modeSizesForVersion(version)[mode];
}

function checkVersion(version) {
  if (version < 1 || version > 40) {
    throw new Error(`Invalid version (was ${version}, expected 1 to 40)`);
  }
}

// Add lostPoint scoring functions for mask evaluation
function lostPoint(modules) {
  const n = modules.length;
  let score = 0;
  score += _lostPointLevel1(modules, n);
  score += _lostPointLevel2(modules, n);
  score += _lostPointLevel3(modules, n);
  score += _lostPointLevel4(modules, n);
  return score;
}

function _lostPointLevel1(modules, n) {
  let lost = 0;
  for (let i = 0; i < n; i++) {
    let sameCount = 1;
    let prev = modules[i][0];
    for (let j = 1; j < n; j++) {
      if (modules[i][j] === prev) {
        sameCount++;
      } else {
        if (sameCount >= 5) lost += (sameCount - 2);
        sameCount = 1;
        prev = modules[i][j];
      }
    }
    if (sameCount >= 5) lost += (sameCount - 2);
  }
  for (let j = 0; j < n; j++) {
    let sameCount = 1;
    let prev = modules[0][j];
    for (let i = 1; i < n; i++) {
      if (modules[i][j] === prev) {
        sameCount++;
      } else {
        if (sameCount >= 5) lost += (sameCount - 2);
        sameCount = 1;
        prev = modules[i][j];
      }
    }
    if (sameCount >= 5) lost += (sameCount - 2);
  }
  return lost;
}

function _lostPointLevel2(modules, n) {
  let lost = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const c = modules[i][j];
      if (c === modules[i][j+1] && c === modules[i+1][j] && c === modules[i+1][j+1]) {
        lost += 3;
      }
    }
  }
  return lost;
}

function _lostPointLevel3(modules, n) {
  let lost = 0;
  const pattern1 = [true,false,true,true,true,false,true,false,false,false,false];
  const pattern2 = [false,false,false,false,true,false,true,true,true,false,true];
  // rows
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= n - 11; j++) {
      let match1 = true, match2 = true;
      for (let k = 0; k < 11; k++) {
        if (modules[i][j+k] !== pattern1[k]) match1 = false;
        if (modules[i][j+k] !== pattern2[k]) match2 = false;
      }
      if (match1 || match2) lost += 40;
    }
  }
  // columns
  for (let j = 0; j < n; j++) {
    for (let i = 0; i <= n - 11; i++) {
      let match1 = true, match2 = true;
      for (let k = 0; k < 11; k++) {
        if (modules[i+k][j] !== pattern1[k]) match1 = false;
        if (modules[i+k][j] !== pattern2[k]) match2 = false;
      }
      if (match1 || match2) lost += 40;
    }
  }
  return lost;
}

function _lostPointLevel4(modules, n) {
  let darkCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (modules[i][j]) darkCount++;
    }
  }
  const total = n * n;
  const percent = (darkCount / total) * 100;
  const prev5 = Math.abs(percent - 50) / 5;
  return Math.floor(prev5) * 10;
}

// BitMatrix for QR module management
class BitMatrix {
  constructor(size) {
    this.size = size;
    this.data = Array.from({ length: size }, () => Array(size).fill(null));
    this.reserved = Array.from({ length: size }, () => Array(size).fill(false));
  }
  set(x, y, value, reserve = false) {
    this.data[y][x] = value;
    if (reserve) this.reserved[y][x] = true;
  }
  get(x, y) {
    return this.data[y][x];
  }
  isReserved(x, y) {
    return this.reserved[y][x];
  }
  forEach(fn) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        fn(x, y, this.data[y][x], this.reserved[y][x]);
      }
    }
  }
  clone() {
    const m = new BitMatrix(this.size);
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        m.data[y][x] = this.data[y][x];
        m.reserved[y][x] = this.reserved[y][x];
      }
    }
    return m;
  }
}

export { BitMatrix };

// export new functions
export { lostPoint };

// Export as ES module
export {
  MODE_NUMBER, MODE_ALPHA_NUM, MODE_8BIT_BYTE, MODE_KANJI,
  MODE_SIZE_SMALL, MODE_SIZE_MEDIUM, MODE_SIZE_LARGE,
  ALPHA_NUM, RE_ALPHA_NUM, NUMBER_LENGTH,
  PATTERN_POSITION_TABLE, G15, G18, G15_MASK, PAD0, PAD1,
  bchDigit, bchTypeInfo, bchTypeNumber,
  patternPosition, maskFunc, modeSizesForVersion,
  lengthInBits, checkVersion,
  // rsPoly lookup table: maps ecCount to RS generator polynomial coefficients
  rsPolyLUT
};
