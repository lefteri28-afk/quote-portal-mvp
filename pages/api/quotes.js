import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { parseQuoteXlsx } from '../../lib/xlsx.js';
import { generateCustomerPdf } from '../../lib/pdf.js';
import { getContract } from '../../lib/blockchain.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
``

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  if (!files.file) {
    return res.status(400).json({ error: 'Missing .xlsx file' });
  }

  const buf = fs.readFileSync(files.file.filepath);
  const rows = parseQuoteXlsx(buf);

  if (!rows.length) {
    return res.status(400).json({ error: 'No rows parsed from sheet' });
  }

  const items = rows.filter(r => r['Quotation']).map(r => ({
    part: r['Parts number'] || '',
    desc: r['Description'] || '',
    qtyTier: r["Q'ty"] || '',
    price: typeof r['Quotation'] === 'string'
      ? r['Quotation']
      : Number(r['Quotation']).toFixed(2),
  }));

  const seq = String(Date.now()).slice(-6);
  const year = new Date().getFullYear();
  const quoteId = `Q-${year}-${seq}`;
  const version = 1;

  // --- VERCEL-SAFE TEMP STORAGE ---
  const quoteDir = path.join('/tmp', 'quotes', quoteId);
  const internalDir = path.join('/tmp', 'internal', quoteId);
  fs.mkdirSync(quoteDir, { recursive: true });
  fs.mkdirSync(internalDir, { recursive: true });

  const pdfPath = path.join(quoteDir, `v${version}.pdf`);

  const terms = String(fields.notes || '');
  const footer = {
    validity: '30 Days',
    paymentTerms: 'Net 30',
    deliveryTerms: 'FOB',
    warrantyLeadTime: 'Standard',
  };

  generateCustomerPdf({
    quoteId,
    customer,
    items,
    terms,
    footer,
    outPath: pdfPath,
  });

  const internal = {
    quoteId,
    version,
    customer,
    currency: 'USD',
    rows,
  };

  const jsonPath = path.join(internalDir, `v${version}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(internal));

  const pdfHash = '0x' + crypto
    .createHash('sha256')
    .update(fs.readFileSync(pdfPath))
    .digest('hex');

  const metaHash = '0x' + crypto
    .createHash('sha256')
    .update(fs.readFileSync(jsonPath))
    .digest('hex');

  // Blockchain (safe even if it errors)
  let txHash = null;
  try {
    const c = getContract();
    const tx = await c.logQuoteCreated(quoteId, version, pdfHash, metaHash);
    const rc = await tx.wait();
    txHash = rc.hash;
  } catch (e) {
    console.error('Blockchain error:', e.message);
  }

  // Secure link
  const ttl = Number(process.env.TOKEN_TTL_HOURS || '168');
  const token = jwt.sign(
    { quoteId, version, email: customer.email },
    process.env.LINK_TOKEN_SECRET || 'dev',
    { expiresIn: `${ttl}h` }
  );

  const secureLink =
    `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/view?token=${token}`;

  return res.status(200).json({
    ok: true,
    quoteId,
    version,
    pdfHash,
    metaHash,
    txHash,
    secureLink,
  });
}
