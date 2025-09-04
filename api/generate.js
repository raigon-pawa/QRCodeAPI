// Vercel serverless entrypoint for QRCodeAPI
import { generateHandler } from '../src/api/generate.js';

export default function handler(req, res) {
  // Vercel uses req.method and req.body
  if (req.method === 'POST') {
    return generateHandler(req, res);
  }
  res.status(405).json({ error: 'Method Not Allowed' });
}
