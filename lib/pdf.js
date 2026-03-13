const PDFDocument = require('pdfkit');
const fs = require('fs');

function generateCustomerPdf({ quoteId, customer, items, terms, footer, outPath }){
  const doc = new PDFDocument({ size:'A4', margin: 48 });
  doc.pipe(fs.createWriteStream(outPath));

  doc.fontSize(16).text('SANYO DENKI AMERICA, INC.', { align:'left' });
  doc.moveDown(0.2);
  doc.fontSize(20).text('Quotation', { align:'left' });
  doc.moveDown();
  doc.fontSize(10).text(`Quote #: ${quoteId}`);
  doc.text(`Date: ${new Date().toISOString().slice(0,10)}`);
  doc.text('Currency: USD');
  doc.moveDown();
  doc.text(`To: ${customer.name}`);
  doc.text(`Email: ${customer.email}`);
  doc.moveDown();

  doc.fontSize(12).text('Quoted Items');
  doc.moveDown(0.5);
  // table header
  const headers = ['No','Part Number','Description','Qty Tier','Unit Price (USD)'];
  const colX = [48, 90, 210, 420, 500];
  doc.fontSize(10);
  headers.forEach((h,i)=> doc.text(h, colX[i], doc.y, { continued: i < headers.length-1 }));
  doc.moveDown(0.5);

  items.forEach((it, idx)=>{
    const y = doc.y;
    const row = [String(idx+1), it.part, it.desc, it.qtyTier, it.price];
    row.forEach((val,i)=> doc.text(String(val), colX[i], y, { continued: i < row.length-1 }));
    doc.moveDown(0.3);
  });

  doc.addPage();
  doc.fontSize(12).text('Terms & Conditions');
  doc.moveDown(0.5);
  doc.fontSize(9).text(terms);

  doc.moveDown(1);
  doc.fontSize(9).text(`Validity: ${footer.validity} | Payment Terms: ${footer.paymentTerms} | Delivery: ${footer.deliveryTerms} | Warranty / Lead Time: ${footer.warrantyLeadTime}`);

  doc.end();
}

module.exports = { generateCustomerPdf };
