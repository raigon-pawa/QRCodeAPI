// QR code generation API wrapper

import { parseConfig } from './config.js';
import { sendError } from './errors.js';

import { generate } from '../lib/qrcode_generator.js';
import { renderPNG, renderSVG, renderASCII } from '../lib/qrcode_painter.js';

// Vercel serverless entrypoint for QRCodeAPI
export default function handler(req, res) {
  if (req.method === 'POST') {
    return generateHandler(req, res);
  }
  res.status(405).json({ error: 'Method Not Allowed' });
}

// Express route handler for /api/generate
export function generateHandler(req, res) {
  try {
    const type = req.body.type || 'png';
    const config = parseConfig(type, req.body);
    const matrix = generate(config.text, config);
    if (type === 'png') {
      const pngBuffer = renderPNG(matrix, { boxSize: 10, border: 4 });
  res.setHeader('Content-Type', 'image/png');
      res.send(pngBuffer);
    } else if (type === 'svg') {
      const svgString = renderSVG(matrix, { boxSize: 10, border: 4, color: config.color });
  res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svgString);
    } else if (type === 'ascii') {
      const asciiString = renderASCII(matrix, { boxSize: 1, border: 2 });
  res.setHeader('Content-Type', 'text/plain');
      res.send(asciiString);
    } else {
      // fallback: return matrix as JSON
  res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(matrix));
    }
  } catch (err) {
    sendError(res, err);
  }
}