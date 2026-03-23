import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { generateCustomerPdf } from '../../lib/pdf_clean.js'; // use the clean module

export default async function handler(req, res) {
  const { quoteId, v, token } = req.query;
  const version = Number(v || 1);

  const pdfPath = path.join('/tmp', 'quotes', quoteId, `v${version}.pdf`);

  // If the PDF already exists in this invocation's /tmp, stream it
  if (fs.existsSync(pdfPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    return fs.createReadStream(pdfPath).pipe(res);
  }

  // If not, try to rebuild from a signed token
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.LINK_TOKEN_SECRET || 'dev');

      // Basic validation: token quote/version must match the query
      if (payload.quoteId !== quoteId || Number(payload.version) !== version) {
        return res.status(400).end('Token/URL mismatch');
      }

      // Rebuild the PDF into /tmp and stream
      const quoteDir = path.join('/tmp', 'quotes', quoteId);
      fs.mkdirSync(quoteDir, { recursive: true });

      await generateCustomerPdf({
        quoteId: payload.quoteId,
        customer: payload.customer,
        items: payload.items,
        terms: payload.terms,
        footer: payload.footer,
        outPath: pdfPath,
      });

      res.setHeader('Content-Type', 'application/pdf');
      return fs.createReadStream(pdfPath).pipe(res);
    } catch (err) {
      console.error('pdf rebuild error:', err?.message || err);
      return res.status(404).end('PDF not found');
    }
  }

  // No file and no rebuild token → 404
  return res.status(404).end('PDF not found');
}
  res.setHeader('Content-Type', 'application/pdf');
  fs.createReadStream(pdfPath).pipe(res);
}
