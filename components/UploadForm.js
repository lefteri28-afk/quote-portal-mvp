import React, { useState } from 'react';

export default function UploadForm() {
  const [customerName, setCustomerName] = useState('ABC Robotics');
  const [customerEmail, setCustomerEmail] = useState('lefteris.alitheoflu@sanyodenki.com');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setResult(null);
    setCopied(false);

    if (!file) {
      setMsg('Please attach an Excel (.xlsx)');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('customerName', customerName);
      fd.append('customerEmail', customerEmail);
      fd.append('notes', notes);

      const res = await fetch('/api/quotes', { method: 'POST', body: fd });
      const txt = await res.text();

      // Try to parse JSON; if it fails, show the raw text
      try {
        const json = JSON.parse(txt);
        setResult(json);
        setMsg(JSON.stringify(json, null, 2));
      } catch {
        setMsg(txt);
      }
    } catch (err) {
      setMsg(`Network/JS error: ${err?.message || String(err)}`);
    }
  };

  const copySecureLink = async () => {
    if (result?.secureLink) {
      await navigator.clipboard.writeText(result.secureLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{border:'1px solid #ddd', padding:16, borderRadius:8}}>
      <h3>Create Quote</h3>

      <div>
        <label>Customer Name</label><br/>
        <input value={customerName} onChange={e=>setCustomerName(e.target.value)} style={{width:'100%'}}/>
      </div>

      <div>
        <label>Customer Email</label><br/>
        <input value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} style={{width:'100%'}}/>
      </div>

      <div>
        <label>Spreadsheet (.xlsx)</label><br/>
        <input type="file" accept=".xlsx" onChange={e=>setFile(e.target.files?.[0]||null)} />
      </div>

      <div>
        <label>Public Notes (optional)</label><br/>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} style={{width:'100%'}}/>
      </div>

      <button type="submit">Upload &amp; Generate</button>

      {/* ✅ Clickable link + Copy button when secureLink is present */}
      {result?.secureLink && (
        <div style={{marginTop:12, padding:10, background:'#f6ffed', border:'1px solid #b7eb8f', borderRadius:6}}>
          <strong>Secure link:</strong>{' '}
          <a
            href={result.secureLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{wordBreak:'break-all'}}
          >
            Open in new tab
          </a>
          {' '}
          <button type="button" onClick={copySecureLink} style={{marginLeft:8}}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}

      {/* Original JSON display */}
      {msg && <pre style={{whiteSpace:'pre-wrap', marginTop:12}}>{msg}</pre>}
    </form>
  );
}
