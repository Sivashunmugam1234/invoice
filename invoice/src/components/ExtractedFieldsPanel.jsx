import { AMOUNT_KEYS, FIELD_LABELS, VALIDATION_LABELS } from '../utils/invoiceUi'

export default function ExtractedFieldsPanel({
  extractedFields,
  extractError,
  validationResult,
  workflowStatus,
}) {
  if (!extractedFields && !extractError) return null

  return (
    <section className="bg-bg2 border border-border rounded-[20px] p-6 transition-colors hover:border-border-hi col-span-full animate-fadeUp [animation-duration:0.4s]">
      <div className="flex items-center gap-3.5 mb-6 flex-wrap">
        <h2 className="font-display text-2xl font-normal text-text">Extracted Fields</h2>
        {workflowStatus && (
          <span className={`font-mono text-[0.68rem] tracking-[0.1em] uppercase px-3 py-1 rounded-full border text-text-2 bg-bg3 ${workflowStatus === 'stored' ? 'border-green/40 text-green bg-green-dim' : workflowStatus === 'validation_failed' || workflowStatus === 'failed' ? 'border-red/40 text-red bg-red-dim' : 'border-border-hi'}`}>
            {workflowStatus.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {extractError ? (
        <div className="space-y-3">
          <div className="px-3.5 py-2.5 rounded-[10px] text-[0.82rem] bg-red-dim text-red border border-red/30 animate-slideIn">x {extractError}</div>
          {extractError.includes('Tesseract') && (
            <div className="px-3.5 py-3 rounded-[10px] text-[0.8rem] bg-blue-dim text-blue border border-blue/30">
              <p className="font-semibold mb-2">Fix: Install Tesseract-OCR</p>
              <p className="mb-2">For image/screenshot extraction, you need Tesseract-OCR:</p>
              <ul className="list-disc list-inside space-y-1 text-[0.75rem]">
                <li><strong>Windows:</strong> Download from <a href="https://github.com/UB-Mannheim/tesseract/wiki" target="_blank" rel="noopener noreferrer" className="underline">tesseract wiki</a></li>
                <li><strong>macOS:</strong> <code className="bg-bg3 px-1 rounded">brew install tesseract</code></li>
                <li><strong>Linux:</strong> <code className="bg-bg3 px-1 rounded">sudo apt-get install tesseract-ocr</code></li>
              </ul>
              <p className="mt-2 text-[0.75rem]">After installation, restart the backend server.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2.5 mb-7 max-[680px]:grid-cols-2">
            {Object.entries(FIELD_LABELS).map(([key, label]) => {
              const val = extractedFields[key]
              if (val == null || val === '') return null
              const isAmt = AMOUNT_KEYS.has(key)
              return (
                <div key={key} className={`bg-bg3 border border-border rounded-[14px] px-[18px] py-4 transition-all hover:border-border-hi hover:-translate-y-0.5 ${isAmt ? '[&_dt]:text-gold/60 [&_dd]:font-mono [&_dd]:text-gold [&_dd]:text-[1.05rem]' : ''}`}>
                  <dt className="font-mono text-[0.66rem] tracking-[0.12em] uppercase text-text-3 mb-1.5">{label}</dt>
                  <dd className="text-[0.94rem] font-medium text-text break-words">{typeof val === 'number' ? val.toFixed(2) : val}</dd>
                </div>
              )
            })}
          </dl>

          {extractedFields.items?.length > 0 && (
            <div className="mt-1 mb-7">
              <p className="font-display text-[1.1rem] font-normal text-text mb-3.5 italic">Line Items</p>
              <table className="w-full border-collapse text-[0.84rem]">
                <thead>
                  <tr className="border-b border-border-hi">
                    <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-left font-normal">Description</th>
                    <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-right font-normal">Qty</th>
                    <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-right font-normal">Unit Price</th>
                    <th className="font-mono text-[0.67rem] tracking-[0.12em] uppercase text-text-3 px-3.5 py-2.5 text-right font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedFields.items.map((item, i) => (
                    <tr key={i} className="transition-colors hover:bg-white/[0.025] [&>td]:text-text">
                      <td className="px-3.5 py-3 text-text-2 border-b border-border last:border-b-0">{item.description}</td>
                      <td className="px-3.5 py-3 text-text-2 border-b border-border last:border-b-0 font-mono text-right">{item.quantity ?? '-'}</td>
                      <td className="px-3.5 py-3 text-text-2 border-b border-border last:border-b-0 font-mono text-right">{item.unit_price != null ? item.unit_price.toFixed(2) : '-'}</td>
                      <td className="px-3.5 py-3 text-text-2 border-b border-border last:border-b-0 font-mono text-right">{item.amount != null ? item.amount.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {validationResult && (
            <div className="mt-1 pt-6 border-t border-border">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-display text-[1.1rem] font-normal italic text-text">Validation</h3>
                <span className={`font-mono text-[0.68rem] tracking-[0.1em] uppercase px-3 py-1 rounded-full ${validationResult.is_valid ? 'bg-green-dim text-green border border-green/35' : 'bg-red-dim text-red border border-red/35'}`}>
                  {validationResult.is_valid ? 'Passed' : 'Failed'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(VALIDATION_LABELS).map(([key, label]) => (
                  <div key={key} className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[0.82rem] border transition-transform hover:-translate-y-px ${validationResult[key] ? 'bg-green-dim border-green/25 text-green' : 'bg-red-dim border-red/25 text-red'}`}>
                    <span className="text-[0.88rem] font-bold">{validationResult[key] ? 'OK' : 'NO'}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              {validationResult.errors?.length > 0 && (
                <ul className="list-none grid gap-1.5 px-[18px] py-3.5 bg-red-dim border border-red/20 rounded-xl">
                  {validationResult.errors.map((line, i) => <li key={i} className="text-[0.82rem] text-red pl-3.5 relative before:content-['→'] before:absolute before:left-0 before:opacity-60">{line}</li>)}
                </ul>
              )}
            </div>
          )}

          {extractedFields.raw_text && (
            <details className="mt-6 pt-5 border-t border-border">
              <summary className="cursor-pointer font-mono text-[0.72rem] tracking-[0.1em] uppercase text-text-3 select-none transition-colors hover:text-text-2">Raw OCR text</summary>
              <pre className="mt-3.5 p-4 bg-bg3 border border-border rounded-xl font-mono text-[0.74rem] leading-[1.75] whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto text-text-2">{extractedFields.raw_text}</pre>
            </details>
          )}
        </>
      )}
    </section>
  )
}
