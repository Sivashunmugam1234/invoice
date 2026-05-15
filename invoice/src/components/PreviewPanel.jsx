import { AMOUNT_KEYS, FIELD_LABELS, VALIDATION_LABELS, formatSize } from '../utils/invoiceUi'

export default function PreviewPanel({
  activeInvoice,
  extractedFields,
  validationResult,
  workflowStatus,
  isExtracting,
  onExtract,
  onExportCsv,
  onExportExcel,
  decision,
  decisionReason,
  onDecisionReasonChange,
  onApprove,
  onReject,
  isSavingDecision,
  decisionError,
  decisionMessage,
}) {
  if (!activeInvoice) {
    return (
      <section className="bg-bg2 border border-border rounded-2xl p-6 transition-colors hover:border-border-hi min-h-[420px] grid place-items-center">
        <div className="text-center">
          <div className="font-display text-2xl text-text mb-2">Invoice Review</div>
          <div className="font-mono text-xs tracking-[0.08em] uppercase text-text-3">Select a document to review</div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-bg2 border border-border rounded-2xl p-4 transition-colors hover:border-border-hi">
      <div className="flex justify-between items-start mb-4 gap-3 max-sm:flex-col">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[0.7rem] tracking-[0.14em] uppercase text-text-3 m-0 mb-2">Invoice Review</p>
          <div className="text-[0.9rem] font-medium text-text whitespace-nowrap overflow-hidden text-ellipsis">{activeInvoice.originalName}</div>
          <div className="font-mono text-[0.7rem] text-text-3 mt-0.5">{formatSize(activeInvoice.size)} | {activeInvoice.status}</div>
        </div>

        <div className="flex gap-2 shrink-0 items-center max-sm:w-full max-sm:flex-wrap">
          <button
            type="button"
            className={`px-[14px] py-[8px] border-none rounded-[10px] font-body text-[0.8rem] font-semibold cursor-pointer transition-all whitespace-nowrap ${isExtracting ? 'bg-transparent text-gold border border-gold/35' : 'bg-gold text-[#0e0e10]'} hover:opacity-90 hover:-translate-y-px disabled:opacity-45 disabled:cursor-wait`}
            onClick={onExtract}
            disabled={isExtracting}
          >
            {isExtracting ? 'Refreshing...' : 'Re-Extract'}
          </button>
          <button type="button" className="px-3.5 py-1.5 border border-border-hi rounded-lg bg-transparent text-text-2 font-body text-[0.78rem] font-medium cursor-pointer transition-all whitespace-nowrap hover:border-gold hover:text-gold hover:bg-gold-dim hover:-translate-y-px" title="Export this invoice to CSV" onClick={onExportCsv}>CSV</button>
          <button type="button" className="px-3.5 py-1.5 border border-border-hi rounded-lg bg-transparent text-text-2 font-body text-[0.78rem] font-medium cursor-pointer transition-all whitespace-nowrap hover:border-gold hover:text-gold hover:bg-gold-dim hover:-translate-y-px" title="Export this invoice to Excel" onClick={onExportExcel}>Excel</button>
        </div>
      </div>

      <div className="grid gap-4 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
        <div className="border border-border rounded-[14px] overflow-hidden bg-bg3">
          <table className="w-full border-collapse text-[0.82rem]">
            <thead>
              <tr className="border-b border-border-hi bg-black/10">
                <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-left font-normal">Field</th>
                <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-left font-normal">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const val = extractedFields?.[key]
                const display = val == null || val === '' ? '-' : typeof val === 'number' ? val.toFixed(2) : val
                return (
                  <tr key={key} className="border-b border-border last:border-b-0">
                    <td className="px-3.5 py-2.5 text-text-2 font-mono text-[0.72rem] uppercase tracking-[0.08em]">{label}</td>
                    <td className={`px-3.5 py-2.5 ${AMOUNT_KEYS.has(key) ? 'font-mono text-gold' : 'text-text'}`}>{display}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {extractedFields?.items?.length > 0 && (
          <div className="border border-border rounded-[14px] overflow-hidden bg-bg3">
            <table className="w-full border-collapse text-[0.82rem]">
              <thead>
                <tr className="border-b border-border-hi bg-black/10">
                  <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-left font-normal">Description</th>
                  <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-right font-normal">Qty</th>
                  <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-right font-normal">Unit Price</th>
                  <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {extractedFields.items.map((item, index) => (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    <td className="px-3.5 py-2.5 text-text">{item.description || '-'}</td>
                    <td className="px-3.5 py-2.5 text-text-2 text-right font-mono">{item.quantity ?? '-'}</td>
                    <td className="px-3.5 py-2.5 text-text-2 text-right font-mono">{item.unit_price != null ? item.unit_price.toFixed(2) : '-'}</td>
                    <td className="px-3.5 py-2.5 text-text-2 text-right font-mono">{item.amount != null ? item.amount.toFixed(2) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {validationResult && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(VALIDATION_LABELS).map(([key, label]) => (
              <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[0.8rem] border ${validationResult[key] ? 'bg-green-dim border-green/25 text-green' : 'bg-red-dim border-red/25 text-red'}`}>
                <span className="font-bold">{validationResult[key] ? 'OK' : 'NO'}</span>
                <span>{label}</span>
              </div>
            ))}
            {workflowStatus && (
              <span className="font-mono text-[0.68rem] tracking-[0.1em] uppercase px-3 py-1 rounded-full border text-text-2 bg-bg3 border-border-hi">
                {workflowStatus.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[0.68rem] tracking-[0.1em] uppercase text-text-3">Reviewer Decision</span>
            {decision?.decision && (
              <span className={`px-2.5 py-1 rounded-full text-[0.72rem] font-mono uppercase tracking-[0.08em] border ${decision.decision === 'approved' ? 'bg-green-dim border-green/30 text-green' : 'bg-red-dim border-red/30 text-red'}`}>
                {decision.decision}
              </span>
            )}
          </div>
          <textarea
            value={decisionReason}
            onChange={e => onDecisionReasonChange(e.target.value)}
            placeholder="Reason (required for reject, optional for approve)"
            className="w-full min-h-[74px] rounded-[10px] border border-border-hi bg-bg3 text-text px-3 py-2.5 focus:outline-none focus:border-gold resize-y"
          />
          {decision?.decision ? (
            <div className="mt-3 px-3 py-2 rounded-[10px] text-[0.82rem] bg-bg3 border border-border-hi text-text-2">
              Decision already recorded as <strong className="text-text">{decision.decision}</strong>.
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={onApprove}
                disabled={isSavingDecision}
                className="px-4 py-2 border-none rounded-[10px] bg-green text-[#0e0e10] font-semibold text-[0.82rem] cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
              >
                {isSavingDecision ? 'Saving...' : 'Approve'}
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={isSavingDecision}
                className="px-4 py-2 border-none rounded-[10px] bg-red text-white font-semibold text-[0.82rem] cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
              >
                {isSavingDecision ? 'Saving...' : 'Reject'}
              </button>
            </div>
          )}
          {decisionError && <div className="mt-3 px-3 py-2 rounded-[10px] text-[0.82rem] bg-red-dim text-red border border-red/30">x {decisionError}</div>}
          {decisionMessage && <div className="mt-3 px-3 py-2 rounded-[10px] text-[0.82rem] bg-green-dim text-green border border-green/30">{decisionMessage}</div>}
        </div>
      </div>
    </section>
  )
}
