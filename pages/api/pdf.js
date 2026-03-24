import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { generateCustomerPdf } from '../../lib/pdf_clean.js';

export default async function handler(req, res) {
  const { quoteId, v, token } = req.query;
  const version = Number(v || 1);
  const showCost =
    req.query?.showCost === '1' || req.query?.showCost === 'true';
  const landscape =
    req.query?.land === '1' || req.query?.land === 'true';

  const pdfPath = path.join('/tmp', 'quotes', quoteId, `v${version}.pdf`);

  if (fs.existsSync(pdfPath) && !showCost && !landscape) {
    // stream cached pdf only if flags are default; otherwise rebuild (flags change layout)
    res.setHeader('Content-Type', 'application/pdf');
    return fs.createReadStream(pdfPath).pipe(res);
  }

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.LINK_TOKEN_SECRET || 'dev');
      if (payload.quoteId !== quoteId || Number(payload.version) !== version) {
        return res.status(400).end('Token/URL mismatch');
      }

      const dir = path.join('/tmp', 'quotes', quoteId);
      fs.mkdirSync(dir, { recursive: true });

      await generateCustomerPdf({
        quoteId: payload.quoteId,
        customer: payload.customer,
        items: payload.items,
        terms: payload.terms,
        footer: payload.footer,
        outPath: pdfPath,
        showCost,
        landscape,
      });

      res.setHeader('Content-Type', 'application/pdf');
      return fs.createReadStream(pdfPath).pipe(res);
    } catch (err) {
      console.error('pdf rebuild error:', err?.message || err);
      return res.status(404).end('PDF not found');
    }
