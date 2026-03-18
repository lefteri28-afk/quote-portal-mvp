// No-op storage for Vercel serverless
export function readDB() {
  return { quotes: [] };
}

export function writeDB(data) {
  // no persistent storage
}
``
