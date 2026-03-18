import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { quoteId, v } = req.query;

  const pdfPath = path.join('/tmp', 'quotes', quoteId, `v${v}.pdf`);

  if (!fs.existsSync(pdfPath))
    return res.status(404).end('PDF not found');

  res.setHeader('Content-Type', 'application/pdf');
  fs.createReadStream(pdfPath).pipe(res);
}
