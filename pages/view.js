
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getContract } from '../lib/blockchain';
export async function getServerSideProps({ query, req }){
  const token = query.token||'';
  try{
    const payload = jwt.verify(token, process.env.LINK_TOKEN_SECRET||'dev');
    const { quoteId, version, email } = payload;
    try{ const salt = crypto.randomBytes(32); const viewerRefHash = '0x'+crypto.createHash('sha256').update(Buffer.concat([salt, Buffer.from(email)])).digest('hex'); const c=getContract(); await (await c.logQuoteViewed(quoteId,version,viewerRefHash)).wait(); }catch(e){ console.error('Chain view log failed:', e.message); }
    const pdfPath = path.join(process.cwd(),'storage','quotes',quoteId,`v${version}.pdf`); const exists = fs.existsSync(pdfPath);
    return { props: { ok:true, quoteId, version, exists } };
  }catch(e){ return { props: { ok:false, error:'Invalid or expired link' } };
  }
}
export default function View({ ok, error, quoteId, version, exists }){
  if(!ok) return <div style={{padding:32,fontFamily:'system-ui'}}>Error: {error}</div>
  const pdfUrl = `/api/pdf?quoteId=${encodeURIComponent(quoteId)}&v=${version}`;
  return (<div style={{padding:16}}>
    <h3>Quotation {quoteId} (v{version})</h3>
    {exists ? (<object data={pdfUrl} type="application/pdf" width="100%" height="800px">PDF preview</object>) : (<div>PDF not found.</div>)}
  </div>);
}
