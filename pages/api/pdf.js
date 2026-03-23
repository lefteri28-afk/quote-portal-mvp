// pages/api/pdf.js
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { generateCustomerPdf } from '../../lib/pdf_clean.js';

export default async function handler(req, res) {
  const { quoteId, v, token } = req.query;
  const showCost = (req.query?.showCost === '1' || req.query?.showCost === 'true');
  const version = Number(v || 1);

  if (!quoteId) {
    return res.status(400).end('Missing quoteId');
  }

  const pdfPath = path.join('/tmp', 'quotes', quoteId, `v${version}.pdf`);

  // If the PDF already exists for this invocation, stream it
  if (fs.existsSync(pdfPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    return fs.createReadStream(pdfPath).pipe(res);
  }

  // Rebuild from token if available
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.LINK_TOKEN_SECRET || 'dev');

      // Sanity check: token must match URL
      if (payload.quoteId !== quoteId || Number(payload.version) !== version) {
        return res.status(400).end('Token/URL mismatch');
      }

      // Rebuild into /tmp and stream
      const dir = path.join('/tmp', 'quotes', quoteId);
      fs.mkdirSync(dir, { recursive: true });

     await generateCustomerPdf({
  quoteId: payload.quoteId,
  customer: payload.customer,
  items: payload.items,
  terms: payload.terms,
  footer: payload.footer,
  outPath: pdfPath,
  showCost, // <- NEW
});

      const showCost =
  req.query?.showCost === '1' || req.query?.showCost === 'true';

await generateCustomerPdf({
  quoteId: payload.quoteId,
  customer: payload.customer,
  items: payload.items,
  terms: payload.terms,
  footer: payload.footer,
  outPath: pdfPath,
  showCost,  // <-- this enables the Cost column if ?showCost=1
});
      
      res.setHeader('Content-Type', 'application/pdf');
      return fs.createReadStream(pdfPath).pipe(res);
    } catch (err) {
      console.error('pdf rebuild error:', err?.message || err);
      return res.status(404).end('PDF not found');
    }
  }

  // No file and no token to rebuild
  return res.status(404).end('PDF not found');
}
