import { useState } from 'react'
import { formatSize } from '../utils/invoiceUi'

export default function UploadPanel({
  selectedFile,
  onFilePick,
  message,
  error,
  isUploading,
  onSubmit,
  fileInputRef,
}) {
  const [dragOver, setDragOver] = useState(false)

  function handleFilePick(file) {
    if (!file) return
    onFilePick(file)
  }

  return (
    <aside className="bg-bg2 border border-border rounded-[20px] p-6 transition-colors hover:border-border-hi">
      <p className="font-mono text-[0.7rem] tracking-[0.14em] uppercase text-text-3 mb-[18px] flex items-center gap-2 before:content-[''] before:w-[3px] before:h-[11px] before:bg-gold before:rounded-sm before:block before:shrink-0">Upload Invoice</p>
      <form onSubmit={onSubmit}>
        <div
          className={`border-[1.5px] border-dashed rounded-[14px] p-7 px-5 text-center cursor-pointer transition-all relative bg-bg3 ${dragOver ? 'border-gold bg-gold-dim' : 'border-border-hi hover:border-gold hover:bg-gold-dim'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            handleFilePick(e.dataTransfer.files?.[0])
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={e => handleFilePick(e.target.files?.[0])}
          />
          <span className="text-[2rem] mb-2.5 block opacity-45">UP</span>
          <p className="text-[0.84rem] text-text-2 leading-6">
            <strong className="text-gold font-medium">Click to browse</strong> or drag and drop
          </p>
          <p className="font-mono text-[0.67rem] text-text-3 mt-1.5 tracking-[0.08em]">PDF - PNG - JPG - JPEG</p>
        </div>

        {selectedFile && (
          <div className="mt-3 px-3.5 py-2.5 bg-bg3 border border-border-hi rounded-[10px] flex items-center gap-2.5 animate-slideIn">
            <span className="text-[1.2rem] shrink-0">
              {selectedFile.type === 'application/pdf' ? 'PDF' : 'IMG'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[0.82rem] font-medium text-text whitespace-nowrap overflow-hidden text-ellipsis">{selectedFile.name}</div>
              <div className="font-mono text-[0.7rem] text-text-3">{formatSize(selectedFile.size)}</div>
            </div>
          </div>
        )}

        <button
          type="submit"
          className={`w-full mt-3.5 px-3 py-3 border-none rounded-xl font-body text-[0.88rem] font-semibold cursor-pointer tracking-[0.02em] transition-all relative overflow-hidden ${isUploading ? 'bg-bg3 text-gold border border-border-hi' : 'bg-gold text-[#0e0e10]'} hover:opacity-90 hover:-translate-y-px disabled:opacity-45 disabled:cursor-wait disabled:transform-none after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:-translate-x-full after:transition-transform after:duration-[450ms] hover:after:translate-x-full`}
          disabled={isUploading || !selectedFile}
        >
          <span className="relative z-[1]">
            {isUploading ? 'Uploading...' : 'Upload Invoice'}
          </span>
        </button>
      </form>
      {message && <div className="mt-3 px-3.5 py-2.5 rounded-[10px] text-[0.82rem] bg-green-dim text-green border border-green/30 animate-slideIn">ok {message}</div>}
      {error && <div className="mt-3 px-3.5 py-2.5 rounded-[10px] text-[0.82rem] bg-red-dim text-red border border-red/30 animate-slideIn">x {error}</div>}
    </aside>
  )
}
