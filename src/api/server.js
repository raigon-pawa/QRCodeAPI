import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { fileURLToPath } from 'url';
import { generateHandler } from './generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Home page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

import { sendError } from './errors.js';

app.post('/api/generate', generateHandler);

app.use((req, res) => {
  sendError(res, new Error('Not found'), 404);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`QR Code API server running on port ${PORT}`);
});
