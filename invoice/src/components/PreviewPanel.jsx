import { formatSize, withToken } from '../utils/invoiceUi'

function renderPreview(activeInvoice, authToken) {
  if (!activeInvoice) {
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="text-5xl opacity-[0.18]">NO</span>
        <span className="font-mono text-xs text-text-3 tracking-[0.08em]">no document selected</span>
      </div>
    )
  }
  const previewUrl = withToken(activeInvoice.previewUrl, authToken)
  if (activeInvoice.mimeType === 'application/pdf') {
    return (
      <iframe
        key={activeInvoice.id}
        className="w-full h-full border-0"
        src={previewUrl}
        title={activeInvoice.originalName}
      />
    )
  }
  if (activeInvoice.mimeType?.startsWith('image/')) {
    return (
      <img
        key={activeInvoice.id}
        className="w-full h-full object-contain bg-white"
        src={previewUrl}
        alt={activeInvoice.originalName}
      />
    )
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-5xl opacity-[0.18]">NA</span>
      <span className="font-mono text-xs text-text-3 tracking-[0.08em]">preview unavailable</span>
    </div>
  )
}

export default function PreviewPanel({
  activeInvoice,
  authToken,
  isExtracting,
  onExtract,
  onExportCsv,
  onExportExcel,
}) {
  return (
    <section className="bg-bg2 border border-border rounded-[20px] p-6 transition-colors hover:border-border-hi max-lg:col-span-2 max-[680px]:col-span-1">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[0.7rem] tracking-[0.14em] uppercase text-text-3 m-0 mb-[18px] flex items-center gap-2 before:content-[''] before:w-[3px] before:h-[11px] before:bg-gold before:rounded-sm before:block before:shrink-0">Document Viewer</p>
          {activeInvoice && (
            <>
              <div className="text-[0.88rem] font-medium text-text whitespace-nowrap overflow-hidden text-ellipsis">{activeInvoice.originalName}</div>
              <div className="font-mono text-[0.7rem] text-text-3 mt-0.5">{formatSize(activeInvoice.size)}</div>
            </>
          )}
        </div>

        {activeInvoice && (
          <div className="flex gap-2 shrink-0 items-center">
            <button
              type="button"
              className={`px-[18px] py-[9px] border-none rounded-[10px] font-body text-[0.82rem] font-semibold cursor-pointer transition-all whitespace-nowrap relative overflow-hidden ${isExtracting ? 'bg-transparent text-gold border border-gold/35' : 'bg-gold text-[#0e0e10]'} hover:opacity-90 hover:-translate-y-px disabled:opacity-45 disabled:cursor-wait after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:-translate-x-full after:transition-transform after:duration-[450ms] hover:after:translate-x-full`}
              onClick={onExtract}
              disabled={isExtracting}
            >
              {isExtracting ? 'Extracting...' : 'Extract Fields'}
            </button>
            <button type="button" className="px-3.5 py-1.5 border border-border-hi rounded-lg bg-transparent text-text-2 font-body text-[0.78rem] font-medium cursor-pointer transition-all whitespace-nowrap relative overflow-hidden hover:border-gold hover:text-gold hover:bg-gold-dim hover:-translate-y-px after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full after:transition-transform after:duration-[400ms] hover:after:translate-x-full" title="Export CSV" onClick={onExportCsv}>CSV</button>
            <button type="button" className="px-3.5 py-1.5 border border-border-hi rounded-lg bg-transparent text-text-2 font-body text-[0.78rem] font-medium cursor-pointer transition-all whitespace-nowrap relative overflow-hidden hover:border-gold hover:text-gold hover:bg-gold-dim hover:-translate-y-px after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full after:transition-transform after:duration-[400ms] hover:after:translate-x-full" title="Export Excel" onClick={onExportExcel}>Excel</button>
            <a
              className="px-3.5 py-[9px] border border-border-hi rounded-[10px] bg-transparent text-text-2 text-[0.82rem] no-underline font-body transition-colors whitespace-nowrap hover:border-gold hover:text-gold"
              href={withToken(activeInvoice.previewUrl, authToken)}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          </div>
        )}
      </div>

      <div className="h-[540px] border border-border rounded-[14px] overflow-hidden bg-white grid place-items-center transition-colors hover:border-border-hi max-[680px]:h-[360px]">{renderPreview(activeInvoice, authToken)}</div>
    </section>
  )
}
