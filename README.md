# QRCodeAPI

Reinventing the wheel by making a QR Code Generator API from scratch because I hate myself :), Hosted using vercel and open to anyone.

## Features

- Generate QR codes in PNG, SVG, and ASCII formats
- Customizable error correction levels
- Lightweight, zero dependencies for QR logic
- Node.js ES module support

## Installation

```bash
npm install qrcode-lib
```

## Usage

```js
import { generateQRCode } from 'qrcode-lib';

// Basic usage
const qr = generateQRCode('Hello, world!', { format: 'svg' });
console.log(qr); // SVG string
```

## API

### `generateQRCode(data, options)`

- `data` (string): The text to encode.
- `options` (object):
	- `format`: `'png' | 'svg' | 'ascii'` (default: `'svg'`)
 	- `version`: `1 - 40` (default: `auto`)
	- `errorCorrectionLevel`: `'L' | 'M' | 'Q' | 'H'` (default: `'M'`)
	- ...other options

### Other exports

- `encodeData`
- `paintQRCode`
- `QRCodeUtils`
- See source for more details.

## Examples

- See `src/lib/tests/qr_ascii.js`, `qr_png.js`, `qr_svg.js` for usage examples.

## License

MIT
