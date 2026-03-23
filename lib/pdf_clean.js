import PDFDocument from 'pdfkit';
import fs from 'fs';

export function generateCustomerPdf({
  quoteId,
  customer,
  items,
  terms,
  footer,
  outPath,
  showCost = false, // toggle internal cost column
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

      const innerW = doc.page.width - doc.page.margins.left - doc.page.margins.right; // ~499pt
      const startX = doc.page.margins.left;
      let y = doc.y;

     // Keep total table width well below the inner page width (~499pt) to leave a safe right gutter.

// No + Part + Desc + Qty + Price  =  26 + 100 + 190 + 50 + 104 = 470
// With cost: No + Part + Desc + Qty + Cost + Price = 26 + 95 + 170 + 50 + 60 + 98 = 499
const noCol   = { key: '__no',  label: 'No',                width: 26,  align: 'right' };
const partCol = { key: 'part',  label: 'Part Number',       width: 100, align: 'left'  };
const qtyCol  = { key: 'qty',   label: 'Qty Tier',          width: 50,  align: 'right' };
const costCol = { key: 'cost',  label: 'Cost (USD)',        width: 60,  align: 'right' };
const priceCol= { key: 'price', label: 'Unit Price (USD)',  width: 104, align: 'right' };

const descWidthNoCost   = 190;
const descWidthWithCost = 170;

const descCol = {
  key: 'desc',
  label: 'Description',
  width: showCost ? descWidthWithCost : descWidthNoCost,
  align: 'left'
};

const cols = showCost
  ? [noCol, partCol, descCol, qtyCol, costCol, priceCol]   // total 499 (fits A4 inner width)
  : [noCol, partCol, descCol, qtyCol,          priceCol];  // total 470 (extra gutter)
const tableW = cols.reduce((s, c) => s + c.width, 0);

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
        // values with formatting
        const values = {
          '__no':  String(idx + 1),
          'part':  row.part ?? '',
          'desc':  row.desc ?? '',
          'qty':   row.qtyTier ?? '',
          'cost':  row.cost === '' || row.cost == null ? '' : `$${Number(row.cost).toFixed(2)}`,
          'price': row.price === '' || row.price == null ? '' : `$${Number(row.price).toFixed(2)}`
        };

        // compute row height
        const cellHeights = cols.map(c => textHeight(values[c.key], c.width - 6));
        const rowH = Math.max(...cellHeights) + rowPadV * 2;

        // page break guard
        const bottom = doc.page.height - doc.page.margins.bottom - 18;
        if (ry + rowH > bottom) {
          doc.addPage();
          ry = drawHeader(doc.page.margins.top);
        }

        // zebra striping
        if (idx % 2 === 1) {
          doc.save();
          doc.rect(startX, ry, tableW, rowH).fill('#FBFBFD').restore();
        }

        // render cells
        doc.fillColor('#000').fontSize(10);
        let x = startX;
        cols.forEach(col => {
          const val = values[col.key];
          doc.text(String(val ?? ''), x + 3, ry + rowPadV, {
            width: col.width - 6,
            align: col.align || 'left'
          });
          x += col.width;
        });

        return ry + rowH + rowGap;
      }

      // render header & rows
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

      // finalize
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
