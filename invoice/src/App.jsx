import { useEffect, useRef, useState } from 'react'
import './App.css'

/* ── Helpers ─────────────────────────────────────────────── */

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function formatDate(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fileIcon(mimeType) {
  if (!mimeType) return '📄'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.startsWith('image/')) return '🖼️'
  return '📄'
}

const AMOUNT_KEYS = new Set(['subtotal', 'tax', 'total'])

const FIELD_LABELS = {
  invoice_number: 'Invoice No.',
  date:           'Invoice Date',
  due_date:       'Due Date',
  vendor:         'Vendor',
  bill_to:        'Bill To',
  subtotal:       'Subtotal',
  tax:            'Tax / GST',
  total:          'Total Amount',
}

const VALIDATION_LABELS = {
  date_format_ok:        'Date Format',
  amount_consistency_ok: 'Amount Consistency',
  gst_calculation_ok:    'GST Calculation',
  total_match_ok:        'Total Match',
}

/* ── App ─────────────────────────────────────────────────── */

export default function App() {
  const [selectedFile, setSelectedFile]       = useState(null)
  const [dragOver, setDragOver]               = useState(false)
  const [invoices, setInvoices]               = useState([])
  const [activeInvoiceId, setActiveInvoiceId] = useState('')
  const [message, setMessage]                 = useState('')
  const [error, setError]                     = useState('')
  const [isLoading, setIsLoading]             = useState(true)
  const [isUploading, setIsUploading]         = useState(false)
  const [extractedFields, setExtractedFields] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [workflowStatus, setWorkflowStatus]   = useState('')
  const [isExtracting, setIsExtracting]       = useState(false)
  const [extractError, setExtractError]       = useState('')
  const fileInputRef = useRef(null)

  const activeInvoice =
    invoices.find(inv => inv.id === activeInvoiceId) ?? invoices[0] ?? null

  const storedCount = invoices.filter(inv => inv.status === 'stored').length

  /* ── Data fetching ── */

  async function fetchInvoices() {
    try {
      const res = await fetch('/api/invoices')
      if (!res.ok) throw new Error('Could not load invoices.')
      const data = await res.json()
      const next = data.invoices ?? []
      setInvoices(next)
      setActiveInvoiceId(cur => {
        if (!next.length) return ''
        if (cur && next.some(inv => inv.id === cur)) return cur
        return next[0].id
      })
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    fetchInvoices().finally(() => setIsLoading(false))
  }, [])

  /* ── Upload ── */

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedFile) { setError('Choose an invoice file first.'); return }
    const fd = new FormData()
    fd.append('invoice', selectedFile)
    setIsUploading(true); setError(''); setMessage('')
    try {
      const res  = await fetch('/api/invoices', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed.')
      setMessage(`${data.invoice.originalName} uploaded.`)
      setSelectedFile(null)
      setActiveInvoiceId(data.invoice.id)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchInvoices()
    } catch (e) {
      setError(e.message)
    } finally {
      setIsUploading(false)
    }
  }

  function handleFilePick(file) {
    if (!file) return
    setSelectedFile(file)
    setError(''); setMessage('')
  }

  /* ── Extract ── */

  async function handleExtract() {
    if (!activeInvoice) return
    setIsExtracting(true)
    setExtractedFields(null); setValidationResult(null)
    setWorkflowStatus(''); setExtractError('')
    try {
      const res  = await fetch(`/api/invoices/${activeInvoice.id}/extract`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed.')
      setExtractedFields(data.fields)
      setValidationResult(data.validation ?? null)
      setWorkflowStatus(data.workflow_status ?? '')
      // refresh list so status dots update
      fetchInvoices()
    } catch (e) {
      setExtractError(e.message)
    } finally {
      setIsExtracting(false)
    }
  }

  /* ── Preview ── */

  function renderPreview() {
    if (!activeInvoice) return (
      <div className="preview-empty">
        <span className="preview-empty-icon">📂</span>
        <span className="preview-empty-text">no document selected</span>
      </div>
    )
    if (activeInvoice.mimeType === 'application/pdf') return (
      <iframe key={activeInvoice.id} className="document-frame"
        src={activeInvoice.previewUrl} title={activeInvoice.originalName} />
    )
    if (activeInvoice.mimeType?.startsWith('image/')) return (
      <img key={activeInvoice.id} className="document-image"
        src={activeInvoice.previewUrl} alt={activeInvoice.originalName} />
    )
    return (
      <div className="preview-empty">
        <span className="preview-empty-icon">🚫</span>
        <span className="preview-empty-text">preview unavailable</span>
      </div>
    )
  }

  /* ── Render ── */

  return (
    <main className="dashboard">

      {/* ── Header ── */}
      <header className="top-bar">
        <div className="top-bar-left">
          <p className="eyebrow">Invoice Intelligence</p>
          <h1>Extract. Validate. <em>Store.</em></h1>
          <p className="subtitle">
            Upload PDF or image invoices — OCR extracts key fields, validates amounts, and persists everything to your database automatically.
          </p>
        </div>

        <div className="top-bar-stats">
          <div className="stat-chip">
            <span className="stat-number">{invoices.length}</span>
            <span className="stat-label">Uploaded</span>
          </div>
          <div className="stat-chip">
            <span className="stat-number">{storedCount}</span>
            <span className="stat-label">Processed</span>
          </div>
          <div className="stat-chip">
            <span className="stat-number">{invoices.length - storedCount}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">

        {/* ── Upload Panel ── */}
        <aside className="panel">
          <p className="panel-title">Upload Invoice</p>

          <form onSubmit={handleSubmit}>
            {/* Drop zone */}
            <div
              className={`drop-zone${dragOver ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false)
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
              <span className="drop-icon">⬆</span>
              <p className="drop-label">
                <strong>Click to browse</strong> or drag & drop
              </p>
              <p className="drop-formats">PDF · PNG · JPG · JPEG</p>
            </div>

            {/* Selected file preview */}
            {selectedFile && (
              <div className="selected-file">
                <span className="selected-file-icon">
                  {selectedFile.type === 'application/pdf' ? '📕' : '🖼️'}
                </span>
                <div className="selected-file-info">
                  <div className="selected-file-name">{selectedFile.name}</div>
                  <div className="selected-file-size">{formatSize(selectedFile.size)}</div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className={`upload-btn${isUploading ? ' uploading' : ''}`}
              disabled={isUploading || !selectedFile}
            >
              {isUploading && <span className="btn-progress" />}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {isUploading ? 'Uploading…' : 'Upload Invoice'}
              </span>
            </button>
          </form>

          {message && <div className="toast toast--success">✓ {message}</div>}
          {error   && <div className="toast toast--error">✕ {error}</div>}
        </aside>

        {/* ── Invoice List Panel ── */}
        <section className="panel">
          <div className="list-header">
            <p className="panel-title" style={{ margin: 0 }}>Documents</p>
            <span className="count-badge">{invoices.length}</span>
          </div>

          {isLoading ? (
            <div className="loading-shimmer">
              {[0, 1, 2].map(i => <div key={i} className="shimmer-row" style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
          ) : invoices.length === 0 ? (
            <p className="empty-state">no invoices uploaded yet</p>
          ) : (
            <ul className="invoice-list">
              {invoices.map(inv => (
                <li key={inv.id}>
                  <button
                    type="button"
                    className={`invoice-item${inv.id === activeInvoice?.id ? ' invoice-item-active' : ''}`}
                    onClick={() => {
                      setActiveInvoiceId(inv.id)
                      setExtractedFields(null); setValidationResult(null)
                      setWorkflowStatus(''); setExtractError('')
                    }}
                  >
                    <span className="invoice-name">
                      {fileIcon(inv.mimeType)}&nbsp; {inv.originalName}
                    </span>
                    <span className="invoice-meta">
                      <span className={`status-dot dot--${inv.status ?? 'uploaded'}`} />
                      {formatSize(inv.size)} · {formatDate(inv.uploadedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Preview Panel ── */}
        <section className="panel">
          <div className="preview-header">
            <div className="preview-file-info">
              <p className="panel-title" style={{ margin: 0 }}>Document Viewer</p>
              {activeInvoice && (
                <>
                  <div className="preview-filename">{activeInvoice.originalName}</div>
                  <div className="preview-filesize">{formatSize(activeInvoice.size)}</div>
                </>
              )}
            </div>

            {activeInvoice && (
              <div className="preview-actions">
                <button
                  type="button"
                  className={`extract-btn${isExtracting ? ' extracting' : ''}`}
                  onClick={handleExtract}
                  disabled={isExtracting}
                >
                  {isExtracting
                    ? <><span className="pulse-dot" />Extracting…</>
                    : '⚡ Extract Fields'
                  }
                </button>
                <a className="open-link" href={activeInvoice.previewUrl}
                  target="_blank" rel="noreferrer">↗ Open</a>
              </div>
            )}
          </div>

          <div className="preview-surface">{renderPreview()}</div>
        </section>

        {/* ── Extracted Fields Panel ── */}
        {(extractedFields || extractError) && (
          <section className="panel fields-panel">
            <div className="fields-top">
              <h2>Extracted Fields</h2>
              {workflowStatus && (
                <span className={`workflow-badge workflow-badge--${workflowStatus.replace(/_/g, '-')}`}>
                  {workflowStatus.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {extractError ? (
              <div className="toast toast--error">✕ {extractError}</div>
            ) : (
              <>
                {/* Key fields */}
                <dl className="fields-grid">
                  {Object.entries(FIELD_LABELS).map(([key, label]) => {
                    const val = extractedFields[key]
                    if (val == null || val === '') return null
                    const isAmt = AMOUNT_KEYS.has(key)
                    return (
                      <div key={key} className={`field-card${isAmt ? ' field--amount' : ''}`}>
                        <dt>{label}</dt>
                        <dd>{typeof val === 'number' ? val.toFixed(2) : val}</dd>
                      </div>
                    )
                  })}
                </dl>

                {/* Line items */}
                {extractedFields.items?.length > 0 && (
                  <div className="items-section">
                    <p className="section-subtitle">Line Items</p>
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedFields.items.map((item, i) => (
                          <tr key={i}>
                            <td>{item.description}</td>
                            <td>{item.quantity ?? '—'}</td>
                            <td>{item.unit_price != null ? item.unit_price.toFixed(2) : '—'}</td>
                            <td>{item.amount != null ? item.amount.toFixed(2) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Validation */}
                {validationResult && (
                  <div className="validation-section">
                    <div className="validation-header">
                      <h3>Validation</h3>
                      <span className={`validation-pill validation-pill--${validationResult.is_valid ? 'pass' : 'fail'}`}>
                        {validationResult.is_valid ? '✓ Passed' : '✕ Failed'}
                      </span>
                    </div>

                    <div className="validation-checks">
                      {Object.entries(VALIDATION_LABELS).map(([key, label]) => (
                        <div key={key} className={`validation-check check--${validationResult[key] ? 'pass' : 'fail'}`}>
                          <span className="check-icon">{validationResult[key] ? '✓' : '✗'}</span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>

                    {validationResult.errors?.length > 0 && (
                      <ul className="validation-errors">
                        {validationResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {/* Raw text */}
                {extractedFields.raw_text && (
                  <details className="raw-text-details">
                    <summary>Raw OCR text</summary>
                    <pre className="raw-text">{extractedFields.raw_text}</pre>
                  </details>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  )
}