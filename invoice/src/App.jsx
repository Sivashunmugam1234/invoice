import { useEffect, useState } from 'react'
import './App.css'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function formatDate(value) {
  return new Date(value).toLocaleString()
}

const FIELD_LABELS = {
  invoice_number: 'Invoice Number',
  date: 'Invoice Date',
  due_date: 'Due Date',
  vendor: 'Vendor',
  bill_to: 'Bill To',
  subtotal: 'Subtotal',
  tax: 'Tax / VAT',
  total: 'Total Amount',
}

// Phase 5: human-readable labels for validation checks
const VALIDATION_LABELS = {
  date_format_ok: 'Date Format',
  amount_consistency_ok: 'Amount Consistency',
  gst_calculation_ok: 'GST Calculation',
  total_match_ok: 'Total Match',
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [activeInvoiceId, setActiveInvoiceId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [extractedFields, setExtractedFields] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [workflowStatus, setWorkflowStatus] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')

  const activeInvoice =
    invoices.find((invoice) => invoice.id === activeInvoiceId) ?? invoices[0] ?? null

  async function fetchInvoices() {
    try {
      const response = await fetch('/api/invoices')
      if (!response.ok) throw new Error('Could not load uploaded invoices.')
      const data = await response.json()
      const nextInvoices = data.invoices ?? []
      setInvoices(nextInvoices)
      setActiveInvoiceId((currentId) => {
        if (nextInvoices.length === 0) return ''
        if (currentId && nextInvoices.some((inv) => inv.id === currentId)) return currentId
        return nextInvoices[0].id
      })
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    async function loadOnMount() {
      await fetchInvoices()
      setIsLoading(false)
    }
    loadOnMount()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    if (!selectedFile) {
      setError('Choose an invoice file first.')
      setMessage('')
      return
    }
    const formData = new FormData()
    formData.append('invoice', selectedFile)
    setIsUploading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/invoices', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Invoice upload failed.')
      setMessage(`${data.invoice.originalName} uploaded successfully.`)
      setSelectedFile(null)
      setActiveInvoiceId(data.invoice.id)
      form.reset()
      setIsLoading(true)
      await fetchInvoices()
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setIsLoading(false)
      setIsUploading(false)
    }
  }

  async function handleExtract() {
    if (!activeInvoice) return
    setIsExtracting(true)
    setExtractedFields(null)
    setValidationResult(null)
    setWorkflowStatus('')
    setExtractError('')
    try {
      const response = await fetch(`/api/invoices/${activeInvoice.id}/extract`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Extraction failed.')
      setExtractedFields(data.fields)
      setValidationResult(data.validation ?? null)
      setWorkflowStatus(data.workflow_status ?? '')
    } catch (err) {
      setExtractError(err.message)
    } finally {
      setIsExtracting(false)
    }
  }

  function renderPreview() {
    if (!activeInvoice) {
      return <p className="empty-state">Upload an invoice to preview it here.</p>
    }
    if (activeInvoice.mimeType === 'application/pdf') {
      return (
        <iframe
          key={activeInvoice.id}
          className="document-frame"
          src={activeInvoice.previewUrl}
          title={activeInvoice.originalName}
        />
      )
    }
    if (activeInvoice.mimeType.startsWith('image/')) {
      return (
        <img
          key={activeInvoice.id}
          className="document-image"
          src={activeInvoice.previewUrl}
          alt={activeInvoice.originalName}
        />
      )
    }
    return <p className="empty-state">Preview is not available for this file type.</p>
  }

  return (
    <main className="dashboard">
      <section className="top-bar">
        <div>
          <p className="eyebrow">OCR Dashboard</p>
          <h1>Upload and inspect invoices</h1>
          <p className="subtitle">
            Upload a PDF or image invoice, then click <strong>Extract fields</strong> to
            run OCR, extract key data, validate amounts, and store the results.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <aside className="panel upload-panel">
          <h2>Upload invoice</h2>
          <form className="upload-form" onSubmit={handleSubmit}>
            <label htmlFor="invoice-file">Choose PDF or image</label>
            <input
              id="invoice-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null)
                setError('')
                setMessage('')
              }}
            />
            <button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload invoice'}
            </button>
          </form>
          {selectedFile && (
            <p className="helper">
              Selected: {selectedFile.name} ({formatSize(selectedFile.size)})
            </p>
          )}
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
        </aside>

        <section className="panel list-panel">
          <div className="section-header">
            <h2>Uploaded documents</h2>
            <span className="badge">{invoices.length}</span>
          </div>
          {isLoading ? (
            <p className="helper">Loading uploaded invoices...</p>
          ) : invoices.length === 0 ? (
            <p className="empty-state">No invoices uploaded yet.</p>
          ) : (
            <ul className="invoice-list">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <button
                    type="button"
                    className={
                      invoice.id === activeInvoice?.id
                        ? 'invoice-item invoice-item-active'
                        : 'invoice-item'
                    }
                    onClick={() => {
                      setActiveInvoiceId(invoice.id)
                      setExtractedFields(null)
                      setValidationResult(null)
                      setWorkflowStatus('')
                      setExtractError('')
                    }}
                  >
                    <span className="invoice-name">{invoice.originalName}</span>
                    <small>
                      {formatSize(invoice.size)} — {formatDate(invoice.uploadedAt)}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel preview-panel">
          <div className="section-header">
            <div>
              <h2>Document viewer</h2>
              {activeInvoice && (
                <p className="helper">
                  {activeInvoice.originalName} — {formatSize(activeInvoice.size)}
                </p>
              )}
            </div>
            <div className="preview-actions">
              {activeInvoice && (
                <>
                  <button
                    type="button"
                    className="extract-btn"
                    onClick={handleExtract}
                    disabled={isExtracting}
                  >
                    {isExtracting ? 'Extracting...' : 'Extract fields'}
                  </button>
                  <a
                    className="open-link"
                    href={activeInvoice.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open file
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="preview-surface">{renderPreview()}</div>
        </section>

        {/* ── Phase 4 + 5 + 6: Extracted fields + validation panel ── */}
        {(extractedFields || extractError) && (
          <section className="panel fields-panel">
            {/* Workflow status badge */}
            {workflowStatus && (
              <div className={`workflow-badge workflow-badge--${workflowStatus.replace('_', '-')}`}>
                Workflow: <strong>{workflowStatus.replace(/_/g, ' ')}</strong>
              </div>
            )}

            <h2>Extracted fields</h2>

            {extractError ? (
              <p className="error">{extractError}</p>
            ) : (
              <>
                {/* Core fields */}
                <dl className="fields-grid">
                  {Object.entries(FIELD_LABELS).map(([key, label]) => {
                    const value = extractedFields[key]
                    if (!value && value !== 0) return null
                    return (
                      <div key={key} className="field-row">
                        <dt>{label}</dt>
                        <dd>{typeof value === 'number' ? value.toFixed(2) : value}</dd>
                      </div>
                    )
                  })}
                </dl>

                {/* Phase 4: Line items table with qty / unit price / amount */}
                {extractedFields.items && extractedFields.items.length > 0 && (
                  <div className="items-section">
                    <h3>Line Items</h3>
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
                        {extractedFields.items.map((item, index) => (
                          <tr key={index}>
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

                {/* Phase 5: Validation panel */}
                {validationResult && (
                  <div className="validation-section">
                    <h3>
                      Validation{' '}
                      <span
                        className={
                          validationResult.is_valid
                            ? 'validation-pill validation-pill--pass'
                            : 'validation-pill validation-pill--fail'
                        }
                      >
                        {validationResult.is_valid ? 'Passed' : 'Failed'}
                      </span>
                    </h3>

                    <div className="validation-checks">
                      {Object.entries(VALIDATION_LABELS).map(([key, label]) => (
                        <div
                          key={key}
                          className={`validation-check ${validationResult[key] ? 'check--pass' : 'check--fail'}`}
                        >
                          <span className="check-icon">{validationResult[key] ? '✓' : '✗'}</span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>

                    {validationResult.errors && validationResult.errors.length > 0 && (
                      <ul className="validation-errors">
                        {validationResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Raw text toggle */}
                {extractedFields.raw_text && (
                  <details className="raw-text-details">
                    <summary>Raw extracted text</summary>
                    <pre className="raw-text">{extractedFields.raw_text}</pre>
                  </details>
                )}
              </>
            )}
          </section>
        )}
      </section>
    </main>
  )
}

export default App