import PDFDocument from 'pdfkit';
import fs from 'fs';

export function generateCustomerPdf({
  quoteId,
  customer,
  items,
  terms,
  footer,
  outPath,
  showCost = false,
  landscape = false,
  createdDate,
}) {
  return new Promise((resolve, reject) => {
    try {
      // 1) Create document and stream
      const doc = new PDFDocument({
        size: 'A4',
        layout: landscape ? 'landscape' : 'portrait',
        margin: 48,
      });

      const stream = fs.createWriteStream(outPath);
      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);

      // 2) Deterministic metadata (freeze dates so rebuilt PDFs match the original bytes)
      const fixedDate = createdDate
        ? new Date(`${createdDate}T00:00:00Z`)
        : new Date('2000-01-01T00:00:00Z');

      doc.info = {
        Title: `Quotation ${quoteId}`,
        Producer: 'Quote Portal',
        Creator: 'Quote Portal',
        CreationDate: fixedDate,
        ModDate: fixedDate,
      };

      // 3) Pipe AFTER setting doc.info
      doc.pipe(stream);

      // ---------- Header ----------
      const dateLine = createdDate || new Date().toISOString().slice(0, 10);
      doc.fontSize(20).text('Quotation');
      doc.moveDown(0.4);
      doc.fontSize(10).text(`Quote #: ${quoteId}`);
      doc.text(`Date: ${dateLine}`);
      doc.text('Currency: USD');
      doc.moveDown(0.4);
      doc.text(`To: ${customer?.name || ''}`);
      doc.text(`Email: ${customer?.email || ''}`);
      doc.moveDown(0.8);

      // ---------- Table ----------
      doc.fontSize(12).text('Quoted Items');
      doc.moveDown(0.35);

      // Printable width and a guaranteed right gutter
      const innerW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const SAFE_GUTTER = 28;            // right margin so nothing hugs the edge
      const maxTableW = innerW - SAFE_GUTTER;

      const startX = doc.page.margins.left;
      let y = doc.y;

      // Fixed column widths; Description is computed to fit remaining space
      const fixed = {
        no: 26,
        part: 100,
        qty: 50,
        cost: 60,   // used when showCost=true
        price: 104, // wide enough to avoid wrap
      };

      const fixedNoCostTotal  = fixed.no + fixed.part + fixed.qty + fixed.price;            // 280
      const fixedWithCostTotal= fixed.no + fixed.part + fixed.qty + fixed.cost + fixed.price; // 340

      const MIN_DESC_NO_COST   = landscape ? 200 : 170;
      const MIN_DESC_WITH_COST = landscape ? 170 : 150;

      let descWidth;
      let cols;

      if (showCost) {
        const available = Math.max(0, maxTableW - fixedWithCostTotal);
        descWidth = Math.max(MIN_DESC_WITH_COST, available);
        cols = [
          { key: '__no',  label: 'No',               width: fixed.no,    align: 'right' },
          { key: 'part',  label: 'Part Number',      width: fixed.part,  align: 'left'  },
          { key: 'desc',  label: 'Description',      width: descWidth,   align: 'left'  },
          { key: 'qty',   label: 'Qty Tier',         width: fixed.qty,   align: 'right' },
          { key: 'cost',  label: 'Cost (USD)',       width: fixed.cost,  align: 'right' },
          { key: 'price', label: 'Unit Price (USD)', width: fixed.price, align: 'right' },
        ];
      } else {
        const available = Math.max(0, maxTableW - fixedNoCostTotal);
        descWidth = Math.max(MIN_DESC_NO_COST, available);
        cols = [
          { key: '__no',  label: 'No',               width: fixed.no,    align: 'right' },
          { key: 'part',  label: 'Part Number',      width: fixed.part,  align: 'left'  },
          { key: 'desc',  label: 'Description',      width: descWidth,   align: 'left'  },
          { key: 'qty',   label: 'Qty Tier',         width: fixed.qty,   align: 'right' },
          { key: 'price', label: 'Unit Price (USD)', width: fixed.price, align: 'right' },
        ];
      }

