export function errorHandler(err, req, res, next) {
  console.error('API Error:', err.message);
  console.error(err.stack);

  if (err.type === 'validation') {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(status).json({ error: message });
}
