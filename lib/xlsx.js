import XLSX from 'xlsx';

export function parseQuoteXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
const show = '0'; // leave "0" for customer links
const pdfUrl = `/api/pdf?quoteId=${encodeURIComponent(payload.quoteId)}&v=${encodeURIComponent(payload.version)}&token=${encodeURIComponent(token)}&showCost=${show}`;

  return rows
    .map(r => {
      const o = {};
      Object.keys(r).forEach(k => (o[k.trim()] = r[k]));
      return o;
    })
    .filter(r => r['Parts number'] || r['Description']);
}
