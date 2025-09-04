import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { generateHandler } from './generate.js';

const app = express();
app.use(express.json());
app.use(cors());

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
