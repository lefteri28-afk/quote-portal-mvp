// Redaction & mapping config per prior agreement
module.exports = {
  customerFields: ['Parts number','Description',"Q'ty", 'Quotation'],
  hideFields: [
    'FOB Cost','Landed Cost','Assembly Cost','SDA G Profit','Profit Amount','List Price','Type','Location'
  ],
  renameForPdf: {
    'Parts number':'Part Number',
    "Q'ty":'Qty Tier',
    'Quotation':'Unit Price (USD)'
  }
};
