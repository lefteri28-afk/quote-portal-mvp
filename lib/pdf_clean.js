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
  createdDate, // deterministic build date (YYYY-MM-DD)
}) {
  return new Promise((resolve, reject) => {
    try {
      // 1) Create doc/stream
      const doc = new PDFDocument({
        size: 'A4',
        layout: landscape ? 'landscape' : 'portrait',
        margin: 48,
      });

      const stream = fs.createWriteStream(outPath);
      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);

      // 2) Deterministic metadata (so rebuilds match original bytes)
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

      // 3) Start piping AFTER metadata is set
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

      // Printable width + a right gutter so nothing hugs the edge
      const innerW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const SAFE_GUTTER = 28; // right margin
      const maxTableW = innerW - SAFE_GUTTER;

      const startX = doc.page.margins.left;
      let y = doc.y;

      // Fixed columns; Description width is computed from remaining space
      const fixed = {
        no: 26,
        part: 100,
        qty: 50,
        cost: 60,
        price: 104,
      };

      const fixedNoCostTotal   = fixed.no + fixed.part + fixed.qty + fixed.price;             // 280
      const fixedWithCostTotal = fixed.no + fixed.part + fixed.qty + fixed.cost + fixed.price; // 340

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

      const tableW  = cols.reduce((sum, c) => sum + c.width, 0);
      const headerH = 18;
      const rowPadV = 4;
      const rowGap  = 2;

      function drawHeader(hy) {
        doc.save();
        doc.rect(startX, hy, tableW, headerH).fill('#F2F3F5').restore();
        doc.fontSize(10).fillColor('#000');

        let x = startX;
        cols.forEach(col => {
          doc.text(col.label, x + 2, hy + 4, { width: col.width - 4, align: col.align || 'left' });
          x += col.width;
        });
        return hy + headerH;
      }

      function textHeight(text, width) {
        return doc.heightOfString(String(text ?? ''), { width, align: 'left' });
      }

      function drawRow(idx, row, ry) {
        const values = {
          '__no':  String(idx + 1),
          'part':  row.part ?? '',
          'desc':  row.desc ?? '',
          'qty':   row.qtyTier ?? '',
          'cost':  row.cost === '' || row.cost == null ? '' : `$${Number(row.cost).toFixed(2)}`,
          'price': row.price === '' || row.price == null ? '' : `$${Number(row.price).toFixed(2)}`,
        };

        const cellHeights = cols.map(c => textHeight(values[c.key], c.width - 6));
        const rowH = Math.max(...cellHeights) + rowPadV * 2;

        // Page break guard
        const bottom = doc.page.height - doc.page.margins.bottom - 18;
        if (ry + rowH > bottom) {
          doc.addPage();
          ry = drawHeader(doc.page.margins.top);
        }

        // Zebra striping
        if (idx % 2 === 1) {
          doc.save();
          doc.rect(startX, ry, tableW, rowH).fill('#FBFBFD').restore();
        }

        // Render cells
        doc.fillColor('#000').fontSize(10);
        let x = startX;
        cols.forEach(col => {
          const val = values[col.key];
          doc.text(String(val ?? ''), x + 3, ry + rowPadV, {
            width: col.width - 6,
            align: col.align || 'left',
          });
          x += col.width;
        });

        return ry + rowH + rowGap;
      }

      // Render header & rows
      y = drawHeader(y);
      (items || []).forEach((it, i) => {
        y = drawRow(i, it, y);
      });

      // ---------- Terms ----------
      doc.addPage();
      doc.fontSize(12).text('Terms & Conditions');
      doc.moveDown(0.4);
      doc.fontSize(9).text(terms || '', { width: innerW, align: 'left' });
      doc.moveDown(1);
      doc.fontSize(9).text(
        `Validity: ${footer?.validity || ''} | Payment Terms: ${footer?.paymentTerms || ''} | ` +
        `Delivery: ${footer?.deliveryTerms || ''} | Warranty / Lead Time: ${footer?.warrantyLeadTime || ''}`
      );

      // Finalize
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
