const XLSX = require('xlsx');

function parseQuoteXlsx(buffer){
  const wb = XLSX.read(buffer, { type:'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]]; // first sheet
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  // normalize headers by trimming
  return rows.map((r)=>{
    const o={};
    Object.keys(r).forEach(k=>{ o[k.trim()] = r[k]; });
    return o;
  }).filter(r=>r['Parts number'] || r['Description']);
}

module.exports = { parseQuoteXlsx };
