import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { parseQuoteXlsx } from '../../lib/xlsx.js';
// If you created lib/pdf_clean.js, use it; otherwise keep ../../lib/pdf.js
import { generateCustomerPdf } from '../../lib/pdf_clean.js';
import { getContract } from '../../lib/blockchain.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // Ping: GET /api/quotes?ping=1 -> { ok: true, stage: 'handler-alive' }
  if (req.method === 'GET' && req.query?.ping === '1') {
    return res.status(200).json({ ok: true, stage: 'handler-alive' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart/form-data
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

    // Robust file extraction (array or single) and support filepath|path
    const raw = files?.file ?? files?.['file'];
    const fileObj = Array.isArray(raw) ? raw[0] : raw;
    const tempPath = fileObj?.filepath || fileObj?.path;
    if (!tempPath) {
      return res.status(400).json({ ok: false, error: 'Upload missing temporary filepath' });
    }

    // Read & parse Excel
    const buf = fs.readFileSync(tempPath);
    const rows = parseQuoteXlsx(buf);
    if (!rows.length) {
      return res.status(400).json({ error: 'No rows parsed from sheet' });
    }

    // Map visible items (includes optional Cost if present in sheet)
    const items = rows
      .filter(r => r['Quotation'])
      .map(r => ({
        part:    r['Parts number'] || '',
        desc:    r['Description'] || '',
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

    // IDs
    const seq = String(Date.now()).slice(-6);
    const year = new Date().getFullYear();
    const quoteId = `Q-${year}-${seq}`;
    const version = 1;

    // Freeze a deterministic creation date (YYYY-MM-DD) so rebuilt PDFs match the original hash
    const createdDate = new Date().toISOString().slice(0, 10);

    // Serverless-safe temp storage
    const quoteDir = path.join('/tmp', 'quotes', quoteId);
    const internalDir = path.join('/tmp', 'internal', quoteId);
    fs.mkdirSync(quoteDir, { recursive: true });
    fs.mkdirSync(internalDir, { recursive: true });

    const pdfPath = path.join(quoteDir, `v${version}.pdf`);
    const jsonPath = path.join(internalDir, `v${version}.json`);

    // PDF generation (await until file is fully written)
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
      createdDate, // << deterministic date used inside the PDF and metadata
    });

    // Internal JSON (keep serialization stable for metaHash determinism)
    const internal = { quoteId, version, createdDate, customer, currency: 'USD', rows };
    fs.writeFileSync(jsonPath, JSON.stringify(internal));

    // Hashes (0x + sha256(file bytes))
    const pdfHash =
      '0x' + crypto.createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex');
    const metaHash =
      '0x' + crypto.createHash('sha256').update(fs.readFileSync(jsonPath)).digest('hex');

    // Best-effort chain log (do not fail request if chain fails)
    let txHash = null;
    try {
      const c = getContract();
      const tx = await c.logQuoteCreated(quoteId, version, pdfHash, metaHash);
      const rc = await tx.wait();
      txHash = rc.hash;
    } catch (e) {
      console.error('Blockchain error:', e?.message || e);
    }

    // Signed token for the secure link — include createdDate so /api/pdf can rebuild identically
    const ttl = Number(process.env.TOKEN_TTL_HOURS || '168');
    const token = jwt.sign(
      {
        quoteId,
        version,
        email: customer.email, // optional
        customer,              // used for rebuild
        items,                 // used for rebuild
        terms,                 // used for rebuild
        footer,                // used for rebuild
        createdDate,           // << deterministic date carried for rebuild
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
    const message = (err && err.message) ? err.message : String(err);
    console.error('Upload handler error:', message);
    return res.status(500).json({ ok: false, error: message });
  }
}

