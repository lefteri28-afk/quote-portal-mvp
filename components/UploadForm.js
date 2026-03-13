
import React, { useState } from 'react';
export default function UploadForm(){
  const [customerName,setCustomerName]=useState('ABC Robotics');
  const [customerEmail,setCustomerEmail]=useState('lefteris.eleftheriou@sanyodenki.com');
  const [notes,setNotes]=useState('');
  const [file,setFile]=useState(null);
  const [msg,setMsg]=useState('');
  const onSubmit=async(e)=>{e.preventDefault(); if(!file){setMsg('Please attach an Excel (.xlsx)'); return;} const fd=new FormData(); fd.append('file',file); fd.append('customerName',customerName); fd.append('customerEmail',customerEmail); fd.append('notes',notes); const res=await fetch('/api/quotes',{method:'POST',body:fd}); const data=await res.json(); setMsg(JSON.stringify(data,null,2));};
  return (<form onSubmit={onSubmit} style={{border:'1px solid #ddd',padding:16,borderRadius:8}}>
    <h3>Create Quote</h3>
    <div><label>Customer Name</label><br/><input value={customerName} onChange={e=>setCustomerName(e.target.value)} style={{width:'100%'}}/></div>
    <div><label>Customer Email</label><br/><input value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} style={{width:'100%'}}/></div>
    <div><label>Spreadsheet (.xlsx)</label><br/><input type="file" accept=".xlsx" onChange={e=>setFile(e.target.files?.[0]||null)} /></div>
    <div><label>Public Notes (optional)</label><br/><textarea value={notes} onChange={e=>setNotes(e.target.value)} style={{width:'100%'}}/></div>
    <button type="submit">Upload & Generate</button>
    {msg && <pre style={{whiteSpace:'pre-wrap'}}>{msg}</pre>}
  </form>); }
