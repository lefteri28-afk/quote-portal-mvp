// pages/view.js
import jwt from 'jsonwebtoken';

export async function getServerSideProps({ query, req }) {
  const { token } = query || {};
  if (!token) {
    return { props: { ok: false, error: 'Missing token' } };
  }

  try {
    const payload = jwt.verify(token, process.env.LINK_TOKEN_SECRET || 'dev');

    // Compute a relative URL to /api/pdf that includes the token
   const show = '0'; // leave "0" for customer links
const pdfUrl = `/api/pdf?quoteId=${encodeURIComponent(payload.quoteId)}&v=${encodeURIComponent(payload.version)}&token=${encodeURIComponent(token)}&showCost=${show}`;

    

    return {
      props: {
        ok: true,
        quoteId: payload.quoteId,
        version: Number(payload.version) || 1,
        pdfUrl
      }
    };
  } catch (e) {
    return { props: { ok: false, error: 'Invalid or expired link' } };
  }
}

export default function ViewPage({ ok, error, quoteId, version, pdfUrl }) {
  if (!ok) {
    return <div style={{padding:20}}>{error || 'Invalid link'}</div>;
  }

  return (
    <div style={{padding:20, fontFamily:'system-ui, Arial'}}>
      <h2>Quotation {quoteId} (v{version})</h2>
      {/* Stream the PDF from /api/pdf; token is forwarded in the querystring */}
      <iframe
        src={pdfUrl}
        title="Quotation PDF"
        style={{width:'100%', height:'90vh', border:'1px solid #ddd'}}
      />
    </div>
  );
}
