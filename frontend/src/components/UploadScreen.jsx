import { useState, useRef } from 'react'

export function UploadScreen({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please select an .xlsx file.')
      return
    }
    setError(null)
    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || 'Upload failed')
      }
      onUploadSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }
  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const onInputChange = (e) => handleFile(e.target.files[0])

  return (
    <div style={{position:"fixed",inset:0,background:"#080F1D",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <path d="M20 5 L10 18 C6 23 7 29 11 33 C15 37 25 37 29 33 C33 29 34 23 30 18 L20 5 Z" fill="#0D758C" />
          <path d="M20 6.5 L12.5 18 C15 17 18 19 20 18 C23 17 26 18 27.5 18 L20 6.5 Z" fill="white" />
          <circle cx="29" cy="8" r="3" stroke="#F97316" strokeWidth="2.5" fill="none" />
        </svg>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:"#F97316",lineHeight:1.1}}>St. Paul</div>
          <div style={{fontWeight:700,fontSize:16,color:"#0D758C",textTransform:"uppercase",letterSpacing:"0.05em"}}>Beverage Solutions</div>
        </div>
      </div>
      <h1 style={{fontSize:28,fontWeight:700,color:"#F1F5F9",margin:0}}>Production Dashboard</h1>
      <div
        onDragOver={(e)=>{e.preventDefault();setIsDragging(true)}}
        onDragLeave={()=>setIsDragging(false)}
        onDrop={onDrop}
        onClick={()=>!isUploading&&inputRef.current&&inputRef.current.click()}
        style={{width:420,maxWidth:"90vw",border:isDragging?"2px dashed #0D758C":"2px dashed #334155",borderRadius:16,padding:"48px 32px",textAlign:"center",cursor:isUploading?"not-allowed":"pointer",background:isDragging?"rgba(13,117,140,0.08)":"rgba(255,255,255,0.03)",transition:"all 0.2s"}}
      >
        <input ref={inputRef} type="file" accept=".xlsx" style={{display:"none"}} onChange={onInputChange}/>
        {isUploading ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
            <div className="upload-spinner" />
            <span style={{color:"#94A3B8",fontSize:14}}>Uploading and parsing...</span>
          </div>
        ) : (
          <div>
            <div style={{marginBottom:12}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p style={{color:"#94A3B8",fontSize:15,margin:"0 0 8px"}}>Drag and drop your Excel file here, or</p>
            <button style={{background:"#0D758C",color:"white",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:600,cursor:"pointer",marginTop:8}}>Browse for .xlsx file</button>
          </div>
        )}
      </div>
      {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid #EF4444",borderRadius:8,padding:"12px 20px",color:"#FCA5A5",fontSize:13,maxWidth:420,textAlign:"center"}}>{error}</div>}
      <style>{`
        .upload-spinner{width:40px;height:40px;border:3px solid #334155;border-top:3px solid #0D758C;border-radius:50%;animation:upload-spin 0.8s linear infinite}
        @keyframes upload-spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
