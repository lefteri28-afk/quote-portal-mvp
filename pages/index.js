
import fs from 'fs';
import path from 'path';
import UploadForm from '../components/UploadForm';
export default function Home({ quotes }){
  return (<div style={{maxWidth:900, margin:'40px auto', fontFamily:'system-ui, Arial'}}>
    <h2>Quotation Portal (MVP)</h2>
    <UploadForm />
    <h3 style={{marginTop:32}}>Existing Quotes</h3>
    <table border="1" cellPadding="6" style={{borderCollapse:'collapse', width:'100%'}}>
      <thead><tr><th>Quote ID</th><th>Version</th><th>Customer</th><th>Email</th><th>Created</th><th>View Link</th></tr></thead>
      <tbody>{quotes.map(q=> (<tr key={q.quoteId+"-"+q.version}>
        <td>{q.quoteId}</td><td>{q.version}</td><td>{q.customer.name}</td><td>{q.customer.email}</td>
        <td>{new Date(q.createdAt).toLocaleString()}</td>
        <td><a href={q.secureLink} target="_blank">open</a></td>
      </tr>))}</tbody>
    </table>
  </div>);
}
export async function getServerSideProps(){
  const DB_PATH = path.join(process.cwd(),'storage','db.json');
  let quotes=[]; if(fs.existsSync(DB_PATH)){ const db=JSON.parse(fs.readFileSync(DB_PATH,'utf8')); quotes=db.quotes||[]; }
  return { props: { quotes } };
}
