// pages/api/pdf.js
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { generateCustomerPdf } from '../../lib/pdf_clean.js';

export default async function handler(req, res) {
  try {
    const { quoteId, v, token } = req.query;
    const version = Number(v || 1);

    // Optional flags (internal use)
    const showCost = req.query?.showCost === '1' || req.query?.showCost === 'true';
    const landscape = req.query?.land === '1' || req.query?.land === 'true';

    if (!quoteId) {
      return res.status(400).end('Missing quoteId');
    }

    // Cache variant per flags so different layouts don't collide
    const variantSuffix =
      (showCost ? '_cost' : '') + (landscape ? '_land' : '');

    const pdfPath = path.join('/tmp', 'quotes', quoteId, `v${version}${variantSuffix}.pdf`);

    // If the exact PDF variant already exists for this invocation, stream it
    if (fs.existsSync(pdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      return fs.createReadStream(pdfPath).pipe(res);
    }

    // Need a token to rebuild in a fresh invocation
    if (!token) {
      return res.status(404).end('PDF not found');
    }

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, process.env.LINK_TOKEN_SECRET || 'dev');
    } catch {
      return res.status(401).end('Invalid token');
    }

    // Basic consistency check
    if (payload.quoteId !== quoteId || Number(payload.version) !== version) {
      return res.status(400).end('Token/URL mismatch');
    }

    // Rebuild the PDF to /tmp and stream it
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
    console.error('pdf handler error:', err?.message || err);
    return res.status(500).end('PDF error');
  }
}
