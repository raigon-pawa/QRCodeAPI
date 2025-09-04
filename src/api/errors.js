// Error response helper for QR code API
export function sendError(res, err, status = 400) {
  res.status(status).json({ error: err.message });
}