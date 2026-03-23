import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { parseQuoteXlsx } from '../../lib/xlsx.js';
import { generateCustomerPdf } from '../../lib/pdf.js';
import { getContract } from '../../lib/blockchain.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // --- QUICK PING to verify the function runs (open in a browser):
  // GET /api/quotes?ping=1  --> { ok: true, stage: 'handler-alive' }
  if (req.method === 'GET' && req.query?.ping === '1') {
    return res.status(200).json({ ok: true, stage: 'handler-alive' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // parse multipart/form-data
    const form = formidable({ multiples: false });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const customer = {
      name: String(fields.customerName || '').trim(),
      email: String(fields.customerEmail || '').trim(),
    };
    if (!customer.name || !customer.email) {
      return res.status(400).json({ error: 'Missing customer name/email' });
    }

    if (!files?.file) {
      return res.status(400).json({ error: 'Missing .xlsx file' });
    }

    // read & parse xlsx
    // Robustly grab the uploaded file (array or single), and support both `filepath` (v3) and `path` (older)
const raw = files?.file ?? files?.['file'];
const fileObj = Array.isArray(raw) ? raw[0] : raw;
const tempPath = fileObj?.filepath || fileObj?.path;
if (!tempPath) {
  return res.status(400).json({ ok: false, error: 'Upload missing temporary filepath' });
}
const buf = fs.readFileSync(tempPath);
    const rows = parseQuoteXlsx(buf);
    if (!rows.length) {
      return res.status(400).json({ error: 'No rows parsed from sheet' });
    }

    // map visible items
   const items = rows
  .filter(r => r['Quotation'])
  .map(r => ({
    part:   r['Parts number'] || '',
    desc:   r['Description'] || '',
    qtyTier: r["Q'ty"] || '',
    price:
      typeof r['Quotation'] === 'string'
        ? r['Quotation']
        : Number(r['Quotation']).toFixed(2),
    cost:
      r['Cost'] === undefined || r['Cost'] === ''
        ? ''
        : (typeof r['Cost'] === 'string'
            ? r['Cost']
            : Number(r['Cost']).toFixed(2)),
  }));

    // ids
    const seq = String(Date.now()).slice(-6);
    const year = new Date().getFullYear();
    const quoteId = `Q-${year}-${seq}`;
    const version = 1;

    // tmp paths for serverless
    const quoteDir = path.join('/tmp', 'quotes', quoteId);
    const internalDir = path.join('/tmp', 'internal', quoteId);
    fs.mkdirSync(quoteDir, { recursive: true });
    fs.mkdirSync(internalDir, { recursive: true });

    const pdfPath = path.join(quoteDir, `v${version}.pdf`);
    const jsonPath = path.join(internalDir, `v${version}.json`);

    // pdf generation
    const terms = String(fields.notes || '');
const footer = {
  validity: '30 Days',
  paymentTerms: 'Net 30',
  deliveryTerms: 'FOB',
  warrantyLeadTime: 'Standard',
};

await generateCustomerPdf({
  quoteId,
  customer,
  items,
  terms,
  footer,
  outPath: pdfPath,
});

// internal json
const internal = { quoteId, version, customer, currency: 'USD', rows };
    fs.writeFileSync(jsonPath, JSON.stringify(internal));

    // hashes
    const pdfHash =
      '0x' +
      crypto.createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex');
    const metaHash =
      '0x' +
      crypto.createHash('sha256').update(fs.readFileSync(jsonPath)).digest('hex');

    // chain event (best-effort)
    let txHash = null;
    try {
      const c = getContract();
      const tx = await c.logQuoteCreated(quoteId, version, pdfHash, metaHash);
      const rc = await tx.wait();
      txHash = rc.hash;
    } catch (e) {
      // include error but do not fail the whole request
      console.error('Blockchain error:', e?.message || e);
    }

 // --- after computing items, customer, terms, footer, quoteId, version ---
const ttl = Number(process.env.TOKEN_TTL_HOURS || '168');
const token = jwt.sign(
  {
    quoteId,
    version,
    email: customer.email,  // optional
    customer,               // include for rebuild
    items,                  // include for rebuild
    terms,                  // include for rebuild
    footer                  // include for rebuild
  },
  process.env.LINK_TOKEN_SECRET || 'dev',
  { expiresIn: `${ttl}h` }
);
    const proto = (req.headers['x-forwarded-proto'] || 'https');
    const host = req.headers.host;
    const secureLink = `${proto}://${host}/view?token=${token}`;

    return res.status(200).json({
      ok: true,
      quoteId,
      version,
      pdfHash,
      metaHash,
      txHash,
      secureLink,
    });
  } catch (err) {
    // Always return JSON so UI shows something.
    const message = (err && err.message) ? err.message : String(err);
    console.error('Upload handler error:', message);
    return res.status(500).json({ ok: false, error: message });
  }
}
``
