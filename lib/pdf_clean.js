import PDFDocument from 'pdfkit';
import fs from 'fs';

export function generateCustomerPdf({
  quoteId,
  customer,
  items,
  terms,
  footer,
  outPath,
}) {
  // Resolve when the file stream has finished writing the PDF
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 48 }); // portrait, 48pt margins
      const stream = fs.createWriteStream(outPath);

      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);

      doc.pipe(stream);

      // ---------- Header Block ----------
      doc.fontSize(20).text('Quotation', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Quote #: ${quoteId}`);
      doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`);
      doc.text('Currency: USD');
      doc.moveDown(0.5);
      doc.text(`To: ${customer?.name || ''}`);
      doc.text(`Email: ${customer?.email || ''}`);
      doc.moveDown(0.8);

      // ---------- Table ----------
      doc.fontSize(12).text('Quoted Items');
      doc.moveDown(0.4);

      // Page metrics
      const pageInnerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right; // ~499pt with 48pt margins
      let cursorY = doc.y;

      // Column layout (sum must be <= pageInnerWidth)
      // Fits: 30 + 110 + 230 + 60 + 69 = 499 (exact for A4 with 48pt margins)
      const cols = [
        { key: '__no',  label: 'No',                width: 30,  align: 'right' },
        { key: 'part',  label: 'Part Number',       width: 110, align: 'left'  },
        { key: 'desc',  label: 'Description',       width: 230, align: 'left'  },
        { key: 'qty',   label: 'Qty Tier',          width: 60,  align: 'right' },
        { key: 'price', label: 'Unit Price (USD)',  width: 69,  align: 'right' },
      ];

      const startX = doc.page.margins.left;
      const headerHeight = 18; // visual height for header row
      const rowPaddingV = 4;
      const rowGap = 2;

      function drawHeader(y) {
        // header background
        doc.save();
        doc.rect(startX, y, pageInnerWidth, headerHeight).fill('#F2F3F5').restore();

        // header labels
        doc.fontSize(10).fillColor('#000');
        let x = startX;
        cols.forEach(col => {
          doc.text(col.label, x + 2, y + 4, { width: col.width - 4, align: col.align || 'left' });
          x += col.width;
        });
        return y + headerHeight;
      }

      function heightOfCell(text, width) {
        return doc.heightOfString(String(text ?? ''), { width, align: 'left' });
      }

      function drawRow(rowIndex, rowData, y) {
        // compute natural height for each cell; row height = max + padding
        let cellHeights = [];
        let x = startX;

        const values = {
          '__no':  String(rowIndex + 1),
          'part':  rowData.part ?? '',
          'desc':  rowData.desc ?? '',
          'qty':   rowData.qtyTier ?? '',
          'price': (rowData.price === '' || rowData.price == null)
                     ? ''
                     : `$${Number(rowData.price).toFixed(2)}`
        };

        cols.forEach(col => {
          const h = heightOfCell(values[col.key], col.width - 6); // -6 for left/right padding
          cellHeights.push(h);
        });
        const contentHeight = Math.max(...cellHeights);
        const rowHeight = contentHeight + (rowPaddingV * 2);

        // page break if needed (leave a bit of bottom margin)
        const bottomLimit = doc.page.height - doc.page.margins.bottom - 24;
        if (y + rowHeight > bottomLimit) {
          doc.addPage();
          y = drawHeader(doc.page.margins.top);
        }

        // zebra striping
        if (rowIndex % 2 === 1) {
          doc.save();
          doc.rect(startX, y, pageInnerWidth, rowHeight).fill('#FBFBFD').restore();
        }

        // draw cells
        doc.fillColor('#000').fontSize(10);
        x = startX;
        cols.forEach((col, i) => {
          const v = values[col.key];
          const cellX = x + 3;
          const cellY = y + rowPaddingV;
          const cellW = col.width - 6;

          doc.text(String(v ?? ''), cellX, cellY, {
            width: cellW,
            align: col.align || 'left'
          });

          x += col.width;
        });

        return y + rowHeight + rowGap;
      }

      // Render header then rows
      cursorY = drawHeader(cursorY);
      items.forEach((it, idx) => {
        cursorY = drawRow(idx, it, cursorY);
      });

      // ---------- Terms & Conditions on a new page ----------
      doc.addPage();
      doc.fontSize(12).text('Terms & Conditions', { underline: false });
      doc.moveDown(0.5);
      doc.fontSize(9).text(terms || '', {
        width: pageInnerWidth,
        align: 'left'
      });
      doc.moveDown(1);
      doc.fontSize(9).text(
        `Validity: ${footer?.validity || ''} | Payment Terms: ${footer?.paymentTerms || ''} | ` +
        `Delivery: ${footer?.deliveryTerms || ''} | Warranty / Lead Time: ${footer?.warrantyLeadTime || ''}`
      );

      // finalize (finish event will resolve the Promise)
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
