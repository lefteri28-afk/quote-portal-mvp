import PDFDocument from 'pdfkit';
import fs from 'fs';

export function generateCustomerPdf({
  quoteId,
  customer,
  items,
  terms,
  footer,
  outPath,
  showCost = false,        // <- NEW: toggle Cost column
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const stream = fs.createWriteStream(outPath);
      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);
      doc.pipe(stream);

      // ---------- Header ----------
      doc.fontSize(20).text('Quotation');
      doc.moveDown(0.4);
      doc.fontSize(10).text(`Quote #: ${quoteId}`);
      doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`);
      doc.text('Currency: USD');
      doc.moveDown(0.4);
      doc.text(`To: ${customer?.name || ''}`);
      doc.text(`Email: ${customer?.email || ''}`);
      doc.moveDown(0.8);

      // ---------- Table ----------
      doc.fontSize(12).text('Quoted Items');
      doc.moveDown(0.35);

      const pageInnerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right; // ~499pt
      const startX = doc.page.margins.left;
      let cursorY = doc.y;

      // Tight layout that leaves ~14pt right gutter
      // No + Part + Description + Qty + [Cost?] + Price  =  485pt total
      const baseCols = [
        { key: '__no',  label: 'No',                width: 28,  align: 'right' },
        { key: 'part',  label: 'Part Number',       width: 100, align: 'left'  },
        { key: 'desc',  label: 'Description',       width: 210, align: 'left'  },
        { key: 'qty',   label: 'Qty Tier',          width: 50,  align: 'right' },
      ];
      const priceCol = { key: 'price', label: 'Unit Price (USD)', width: 97, align: 'right' };  // 28+100+210+50+97=485
      const costCol  = { key: 'cost',  label: 'Cost (USD)',       width: 60, align: 'right' };  // Optional

      const cols = showCost ? [...baseCols, costCol, { ...priceCol, width: 97 - 60 }] // keep total 485
                            : [...baseCols, priceCol];

      const headerH = 18;
      const rowPadV = 4;
      const rowGap  = 2;

      function drawHeader(y) {
        doc.save();
        doc.rect(startX, y, 485, headerH).fill('#F2F3F5').restore();
        doc.fontSize(10).fillColor('#000');
        let x = startX;
        cols.forEach(col => {
          doc.text(col.label, x + 2, y + 4, { width: col.width - 4, align: col.align || 'left' });
          x += col.width;
        });
        return y + headerH;
      }

      function heightOfCell(t, w) {
        return doc.heightOfString(String(t ?? ''), { width: w, align: 'left' });
      }

      function drawRow(idx, data, y) {
        const values = {
          '__no':  String(idx + 1),
          'part':  data.part ?? '',
          'desc':  data.desc ?? '',
          'qty':   data.qtyTier ?? '',
          'cost':  data.cost === '' || data.cost == null ? '' : `$${Number(data.cost).toFixed(2)}`,
          'price': data.price === '' || data.price == null ? '' : `$${Number(data.price).toFixed(2)}`
        };

        const cellHeights = cols.map(c => heightOfCell(values[c.key], c.width - 6));
        const rowH = Math.max(...cellHeights) + rowPadV * 2;

        const bottomLimit = doc.page.height - doc.page.margins.bottom - 18;
        if (y + rowH > bottomLimit) {
          doc.addPage();
          y = drawHeader(doc.page.margins.top);
        }

        if (idx % 2 === 1) {
          doc.save();
          doc.rect(startX, y, 485, rowH).fill('#FBFBFD').restore();
        }

        doc.fillColor('#000').fontSize(10);
        let x = startX;
        cols.forEach(col => {
          const text = values[col.key];
          doc.text(String(text ?? ''), x + 3, y + rowPadV, { width: col.width - 6, align: col.align || 'left' });
          x += col.width;
        });

        return y + rowH + rowGap;
      }
