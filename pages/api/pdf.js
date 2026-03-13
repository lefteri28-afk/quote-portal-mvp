import fs from 'fs';
import path from 'path';

export default function handler(req, res){
  const { quoteId, v } = req.query;
  const pdfPath = path.join(process.cwd(),'storage','quotes',quoteId,`v${v}.pdf`);
  if(!fs.existsSync(pdfPath)) return res.status(404).end('Not found');
  res.setHeader('Content-Type','application/pdf');
  fs.createReadStream(pdfPath).pipe(res);
}
